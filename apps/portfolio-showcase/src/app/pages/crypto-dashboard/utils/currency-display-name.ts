import { CryptoCoin } from '../models/coin';

// CoinGecko's /simple/supported_vs_currencies returns 63 plain codes
// with no associated names (confirmed against the real endpoint, see
// ROADMAP.md). 12 of those are crypto tickers, named by cross-matching
// the coins list callers already have (see currencyDisplayName below).
// The other 51 are ISO 4217 fiat codes, two precious-metal codes (troy
// ounce silver/gold), the IMF's Special Drawing Rights unit, and two
// Bitcoin display subunits (bits, sats) that aren't separate coins at
// all. This table is scoped to exactly those 51 real codes, not a
// generic ISO 4217 list copied from memory.
const NON_CRYPTO_CURRENCY_NAMES: Record<string, string> = {
  usd: 'US Dollar',
  aed: 'UAE Dirham',
  ars: 'Argentine Peso',
  aud: 'Australian Dollar',
  bdt: 'Bangladeshi Taka',
  bhd: 'Bahraini Dinar',
  bmd: 'Bermudian Dollar',
  brl: 'Brazilian Real',
  cad: 'Canadian Dollar',
  chf: 'Swiss Franc',
  clp: 'Chilean Peso',
  cny: 'Chinese Yuan',
  czk: 'Czech Koruna',
  dkk: 'Danish Krone',
  eur: 'Euro',
  gbp: 'British Pound',
  gel: 'Georgian Lari',
  hkd: 'Hong Kong Dollar',
  huf: 'Hungarian Forint',
  idr: 'Indonesian Rupiah',
  ils: 'Israeli New Shekel',
  inr: 'Indian Rupee',
  jpy: 'Japanese Yen',
  krw: 'South Korean Won',
  kwd: 'Kuwaiti Dinar',
  lkr: 'Sri Lankan Rupee',
  mmk: 'Myanmar Kyat',
  mxn: 'Mexican Peso',
  myr: 'Malaysian Ringgit',
  ngn: 'Nigerian Naira',
  nok: 'Norwegian Krone',
  nzd: 'New Zealand Dollar',
  php: 'Philippine Peso',
  pkr: 'Pakistani Rupee',
  pln: 'Polish Złoty',
  rub: 'Russian Ruble',
  sar: 'Saudi Riyal',
  sek: 'Swedish Krona',
  sgd: 'Singapore Dollar',
  thb: 'Thai Baht',
  try: 'Turkish Lira',
  twd: 'New Taiwan Dollar',
  uah: 'Ukrainian Hryvnia',
  vef: 'Venezuelan Bolívar',
  vnd: 'Vietnamese Đồng',
  zar: 'South African Rand',
  xdr: 'IMF Special Drawing Rights',
  xag: 'Silver',
  xau: 'Gold',
  bits: 'Bits (µBTC)',
  sats: 'Satoshi',
};

/**
 * Display label for a vs_currency code, e.g. "Bitcoin (BTC)" or
 * "US Dollar (USD)". Crypto ticker codes are named by matching `coins`
 * (the same coin list callers already have, e.g. from getMarkets());
 * fiat and other non-crypto codes fall back to the static table above.
 * If neither source has a name for the code (a real edge case: a
 * crypto ticker whose coin has dropped out of the caller's coin list),
 * this returns just the uppercased code, matching this app's existing
 * behavior everywhere a name isn't available, never an empty string.
 */
export function currencyDisplayName(code: string, coins: CryptoCoin[]): string {
  const upperCode = code.toUpperCase();
  const lowerCode = code.toLowerCase();

  const matchingCoin = coins.find((coin) => coin.symbol.toLowerCase() === lowerCode);
  if (matchingCoin) {
    return `${matchingCoin.name} (${upperCode})`;
  }

  const nonCryptoName = NON_CRYPTO_CURRENCY_NAMES[lowerCode];
  if (nonCryptoName) {
    return `${nonCryptoName} (${upperCode})`;
  }

  return upperCode;
}
