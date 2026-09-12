import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { CryptoCoin, GlobalMarketStats, TrendingCoin } from '../models/coin';

const CACHE_TTL_MS = 45_000;
const MIN_REQUEST_SPACING_MS = 1_500;
const MAX_HISTORY_DAYS = 365;

interface RawMarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

interface RawGlobalResponse {
  data: {
    active_cryptocurrencies: number;
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
}

interface RawTrendingResponse {
  coins: { item: { id: string } }[];
}

interface RawMarketChartResponse {
  prices: [number, number][];
}

function mapMarketCoin(raw: RawMarketCoin): CryptoCoin {
  return {
    id: raw.id,
    symbol: raw.symbol,
    name: raw.name,
    image: raw.image,
    currentPrice: raw.current_price,
    rank: raw.market_cap_rank,
    changePercentage24h: raw.price_change_percentage_24h,
    sparkline: raw.sparkline_in_7d?.price ?? [],
  };
}

interface CacheEntry {
  expiresAt: number;
  value: Promise<unknown>;
}

/**
 * Talks to CoinGecko's Demo API and maps every response to this
 * dashboard's own types, so components never see CoinGecko's raw JSON
 * shape. Native `fetch` is used instead of Angular's `HttpClient`: this
 * is app code with a single consumer-facing service, and pulling in
 * `provideHttpClient()` (not used anywhere else in this app, see
 * app.config.ts) just to get an Observable wrapper around one `fetch`
 * call would add DI surface without buying anything, since the
 * cache/spacing logic below is plain Promise chaining either way.
 *
 * Two internal mechanisms, transparent to every caller:
 * - An in-memory cache (45s TTL) keyed by endpoint + serialized params,
 *   manually invalidable via `invalidateCache()` for a refresh button.
 * - A request queue that spaces out real (non-cached) fetches by at
 *   least 1.5s, confirmed necessary in ROADMAP.md: unspaced consecutive
 *   calls made the browser fail with a generic `TypeError: Failed to
 *   fetch`, not a readable CoinGecko error.
 */
@Injectable({ providedIn: 'root' })
export class CoinGeckoService {
  private readonly cache = new Map<string, CacheEntry>();
  private requestQueue: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;

  /** Clears the response cache, forcing the next call of each method to hit the real API. */
  invalidateCache(): void {
    this.cache.clear();
  }

  async getMarkets(vsCurrency: string, count: number): Promise<CryptoCoin[]> {
    const raw = await this.request<RawMarketCoin[]>('/coins/markets', {
      vs_currency: vsCurrency,
      order: 'market_cap_desc',
      per_page: String(count),
      page: '1',
      sparkline: 'true',
    });
    return raw.map(mapMarketCoin);
  }

  async getGlobalStats(): Promise<GlobalMarketStats> {
    const raw = await this.request<RawGlobalResponse>('/global');
    return {
      totalMarketCapByCurrency: raw.data.total_market_cap,
      totalVolumeByCurrency: raw.data.total_volume,
      marketCapChangePercentage24hUsd: raw.data.market_cap_change_percentage_24h_usd,
      dominanceByCoin: raw.data.market_cap_percentage,
      activeCryptocurrencies: raw.data.active_cryptocurrencies,
    };
  }

  async getTrending(): Promise<TrendingCoin[]> {
    const trending = await this.request<RawTrendingResponse>('/search/trending');
    const ids = trending.coins.map((coin) => coin.item.id);
    if (ids.length === 0) return [];

    const markets = await this.request<RawMarketCoin[]>('/coins/markets', {
      vs_currency: 'usd',
      ids: ids.join(','),
      sparkline: 'true',
      per_page: String(ids.length),
    });
    const marketById = new Map(markets.map((coin) => [coin.id, mapMarketCoin(coin)]));
    return ids.map((id) => marketById.get(id)).filter((coin): coin is TrendingCoin => coin !== undefined);
  }

  async getMarketChart(coinId: string, vsCurrency: string, days: number): Promise<number[]> {
    if (days > MAX_HISTORY_DAYS) {
      throw new Error(
        `CoinGecko's public API limits historical data to ${MAX_HISTORY_DAYS} days, requested ${days}.`,
      );
    }
    const raw = await this.request<RawMarketChartResponse>(`/coins/${coinId}/market_chart`, {
      vs_currency: vsCurrency,
      days: String(days),
    });
    return raw.prices.map(([, price]) => price);
  }

  async getSupportedCurrencies(): Promise<string[]> {
    return this.request<string[]>('/simple/supported_vs_currencies');
  }

  private request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const cacheKey = `${path}?${new URLSearchParams(params).toString()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as Promise<T>;
    }

    const responsePromise = this.enqueue(() => this.fetchJson<T>(path, params));
    this.cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: responsePromise });
    responsePromise.catch(() => this.cache.delete(cacheKey));
    return responsePromise;
  }

  /**
   * Chains `task` after the previous real request's spacing gate,
   * without waiting for that previous request to finish: the 1.5s
   * minimum is measured between requests being fired, not between one
   * finishing and the next starting, so a slow fetch never delays the
   * next caller beyond what spacing already requires.
   */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const gate = this.requestQueue.then(async () => {
      const remaining = MIN_REQUEST_SPACING_MS - (Date.now() - this.lastRequestAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      this.lastRequestAt = Date.now();
    });
    this.requestQueue = gate;
    return gate.then(task);
  }

  private async fetchJson<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(environment.coinGecko.baseUrl + path);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      headers: { 'x-cg-demo-api-key': environment.coinGecko.apiKey },
    });
    if (!response.ok) {
      throw new Error(`CoinGecko request to ${path} failed with status ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}
