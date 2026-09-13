import * as fs from 'fs';
import * as path from 'path';
import { environment } from '../../../../environments/environment';
import { CoinGeckoService } from './coingecko';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

const marketCoinSample = {
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  image: 'https://example.com/btc.png',
  current_price: 65000,
  market_cap_rank: 1,
  price_change_percentage_24h: 1.23,
  sparkline_in_7d: { price: [64000, 64500, 65000] },
};

describe('CoinGeckoService (unit, mocked fetch)', () => {
  let service: CoinGeckoService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new CoinGeckoService();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('Unexpected real fetch in a unit test: this call should have been mocked or served from cache.');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('maps /coins/markets to CryptoCoin, never exposing the raw CoinGecko field names', async () => {
    fetchSpy.mockResolvedValue(jsonResponse([marketCoinSample]));

    const [coin] = await service.getMarkets('usd', 1);

    expect(coin).toEqual({
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      image: 'https://example.com/btc.png',
      currentPrice: 65000,
      rank: 1,
      changePercentage24h: 1.23,
      sparkline: [64000, 64500, 65000],
    });
  });

  it('serves a second getMarkets() call with identical params from cache, without a second real fetch', async () => {
    fetchSpy.mockResolvedValue(jsonResponse([marketCoinSample]));

    await service.getMarkets('usd', 10);
    await service.getMarkets('usd', 10);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('invalidateCache() forces the next call to hit a real fetch again', async () => {
    // A fresh Response per call: reusing one instance across two real
    // fetches (this test invalidates the cache between them) throws
    // "Body is unusable" on the second read, since Response.json() can
    // only consume its body once.
    fetchSpy.mockImplementation(async () => jsonResponse([marketCoinSample]));

    await service.getMarkets('usd', 10);
    service.invalidateCache();
    await service.getMarkets('usd', 10);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('spaces two real fetches (different params, so neither is served from cache) by at least 1.5s', async () => {
    vi.useFakeTimers();
    const firedAt: number[] = [];
    fetchSpy.mockImplementation(async () => {
      firedAt.push(Date.now());
      return jsonResponse([marketCoinSample]);
    });

    const first = service.getMarkets('usd', 10);
    const second = service.getMarkets('eur', 10);
    await vi.advanceTimersByTimeAsync(1_500);
    await Promise.all([first, second]);

    expect(firedAt).toHaveLength(2);
    expect(firedAt[1] - firedAt[0]).toBeGreaterThanOrEqual(1_500);
  });

  it('getMarketChart() rejects a range over the confirmed 365-day limit without ever fetching', async () => {
    await expect(service.getMarketChart('bitcoin', 'usd', 400)).rejects.toThrow(/365/);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('getMarketChart() returns just the price series, dropping the timestamps', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        prices: [
          [1_700_000_000_000, 64000],
          [1_700_003_600_000, 64500],
        ],
      }),
    );

    const prices = await service.getMarketChart('bitcoin', 'usd', 30);

    expect(prices).toEqual([64000, 64500]);
  });

  it('maps /global to GlobalMarketStats, reading every currency from the same response', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        data: {
          active_cryptocurrencies: 21084,
          total_market_cap: { usd: 2_654_490_015_954.5, eur: 2_288_403_988_874.2 },
          total_volume: { usd: 107_207_728_882.8, eur: 92_422_496_577.1 },
          market_cap_percentage: { btc: 58.17, eth: 11.65 },
          market_cap_change_percentage_24h_usd: -2.43,
        },
      }),
    );

    const stats = await service.getGlobalStats();

    expect(stats).toEqual({
      totalMarketCapByCurrency: { usd: 2_654_490_015_954.5, eur: 2_288_403_988_874.2 },
      totalVolumeByCurrency: { usd: 107_207_728_882.8, eur: 92_422_496_577.1 },
      marketCapChangePercentage24hUsd: -2.43,
      dominanceByCoin: { btc: 58.17, eth: 11.65 },
      activeCryptocurrencies: 21084,
    });
  });

  it('getTrending() combines /search/trending with a filtered /coins/markets call to get real sparkline data', async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/search/trending')) {
        return jsonResponse({ coins: [{ item: { id: 'bitcoin' } }] });
      }
      if (url.includes('/coins/markets')) {
        expect(url).toContain('ids=bitcoin');
        return jsonResponse([marketCoinSample]);
      }
      throw new Error(`Unexpected URL in test: ${url}`);
    });

    const trending = await service.getTrending();

    expect(trending).toEqual([
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        image: 'https://example.com/btc.png',
        currentPrice: 65000,
        rank: 1,
        changePercentage24h: 1.23,
        sparkline: [64000, 64500, 65000],
      },
    ]);
  });

  it('getTrending() returns an empty array without a complementary call when nothing is trending', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ coins: [] }));

    const trending = await service.getTrending();

    expect(trending).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('getSupportedCurrencies() returns the raw string list as-is', async () => {
    fetchSpy.mockResolvedValue(jsonResponse(['usd', 'eur', 'btc']));

    const currencies = await service.getSupportedCurrencies();

    expect(currencies).toEqual(['usd', 'eur', 'btc']);
  });

  it('getSimplePrice() reads the rate from the nested coin-then-currency shape', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ bitcoin: { usd: 77219 } }));

    const rate = await service.getSimplePrice('bitcoin', 'usd');

    expect(rate).toBe(77219);
  });

  it('getSimplePrice() throws when the requested coin/currency pair is missing from the response', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ bitcoin: {} }));

    await expect(service.getSimplePrice('bitcoin', 'usd')).rejects.toThrow(/bitcoin/);
  });

  it('serves a second getSimplePrice() call with identical params from cache, without a second real fetch', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ bitcoin: { usd: 77219 } }));

    await service.getSimplePrice('bitcoin', 'usd');
    await service.getSimplePrice('bitcoin', 'usd');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('throws a readable error when CoinGecko responds with a non-ok status', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 401 }));

    await expect(service.getMarkets('usd', 10)).rejects.toThrow(/401/);
  });
});

function readCoinGeckoApiKeyFromEnvFile(): string | undefined {
  // Same convention documented in AGENTS.md: secrets live one level
  // above the repo root, referenced explicitly, never assumed. `nx test`
  // runs with the workspace root as cwd, so `../.env` resolves the same
  // way it does for every other script in this repo that reads it.
  const envPath = path.resolve(process.cwd(), '../.env');
  if (!fs.existsSync(envPath)) return undefined;
  const match = fs.readFileSync(envPath, 'utf8').match(/^COINGECKO_DEMO_API_KEY=(.+)$/m);
  return match?.[1]?.trim();
}

describe('CoinGeckoService (real API integration)', () => {
  const realApiKey = readCoinGeckoApiKeyFromEnvFile();
  const placeholderApiKey = environment.coinGecko.apiKey;
  let service: CoinGeckoService;

  beforeEach(() => {
    service = new CoinGeckoService();
    if (realApiKey) environment.coinGecko.apiKey = realApiKey;
  });

  afterEach(() => {
    environment.coinGecko.apiKey = placeholderApiKey;
  });

  // Skipped (not failed) when ../.env has no real key, e.g. in CI, so the
  // rest of the suite still runs green without the secret available.
  it.skipIf(!realApiKey)(
    'getTrending() returns coins with a real, non-empty sparkline, proving the complementary /coins/markets call worked',
    async () => {
      const trending = await service.getTrending();

      expect(trending.length).toBeGreaterThan(0);
      for (const coin of trending) {
        expect(coin.sparkline.length).toBeGreaterThan(0);
      }
    },
    20_000,
  );

  it.skipIf(!realApiKey)(
    'getSimplePrice() returns a real positive conversion rate for bitcoin in usd',
    async () => {
      const rate = await service.getSimplePrice('bitcoin', 'usd');

      expect(typeof rate).toBe('number');
      expect(rate).toBeGreaterThan(0);
    },
    20_000,
  );
});
