/**
 * A single coin as shown across the dashboard (price ticker, market
 * table, currency converter). Mapped from CoinGecko's `/coins/markets`
 * response, never the raw shape.
 */
export interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  rank: number;
  changePercentage24h: number;
  /** 7-day hourly price history (168 points), oldest to newest. */
  sparkline: number[];
}

/**
 * Global market snapshot from CoinGecko's `/global`. Money fields are
 * keyed by currency code (`usd`, `eur`, `btc`, ...) since `/global`
 * returns every currency in one response, no per-currency call needed.
 */
export interface GlobalMarketStats {
  totalMarketCapByCurrency: Record<string, number>;
  totalVolumeByCurrency: Record<string, number>;
  /** Fixed in USD by CoinGecko, there is no per-currency variant. */
  marketCapChangePercentage24hUsd: number;
  /** Fixed in USD by CoinGecko, there is no per-currency variant. */
  volumeChangePercentage24hUsd: number;
  /** Market cap share per coin symbol (e.g. `btc: 58.17`), up to 10 coins. */
  dominanceByCoin: Record<string, number>;
  activeCryptocurrencies: number;
}

/**
 * A coin from CoinGecko's `/search/trending`. Same shape as CryptoCoin:
 * the trending endpoint's own `sparkline` field is just a URL to a
 * pre-rendered SVG image, not real price data, so CoinGeckoService
 * fetches real sparkline numbers through a complementary
 * `/coins/markets` call before returning a TrendingCoin (see
 * `services/coingecko.ts`).
 */
export type TrendingCoin = CryptoCoin;
