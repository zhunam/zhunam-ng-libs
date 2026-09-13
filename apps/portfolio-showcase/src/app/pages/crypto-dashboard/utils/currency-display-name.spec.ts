import { currencyDisplayName } from './currency-display-name';
import { CryptoCoin } from '../models/coin';

function buildCoin(overrides: Partial<CryptoCoin> = {}): CryptoCoin {
  return {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    currentPrice: 65000,
    rank: 1,
    changePercentage24h: 1.5,
    sparkline: [],
    ...overrides,
  };
}

describe('currencyDisplayName', () => {
  it('returns "Name (CODE)" for a crypto ticker matched against the coins list', () => {
    const coins = [buildCoin(), buildCoin({ id: 'ethereum', symbol: 'eth', name: 'Ethereum' })];
    expect(currencyDisplayName('btc', coins)).toBe('Bitcoin (BTC)');
    expect(currencyDisplayName('eth', coins)).toBe('Ethereum (ETH)');
  });

  it('matches case-insensitively regardless of the coin symbol\'s or code\'s casing', () => {
    const coins = [buildCoin({ symbol: 'BTC' })];
    expect(currencyDisplayName('btc', coins)).toBe('Bitcoin (BTC)');
  });

  it('returns "Name (CODE)" for a known fiat code, no coin match needed', () => {
    expect(currencyDisplayName('usd', [])).toBe('US Dollar (USD)');
    expect(currencyDisplayName('eur', [])).toBe('Euro (EUR)');
    expect(currencyDisplayName('jpy', [])).toBe('Japanese Yen (JPY)');
  });

  it('returns "Name (CODE)" for the non-fiat special codes (precious metals, SDR, BTC subunits)', () => {
    expect(currencyDisplayName('xau', [])).toBe('Gold (XAU)');
    expect(currencyDisplayName('xdr', [])).toBe('IMF Special Drawing Rights (XDR)');
    expect(currencyDisplayName('sats', [])).toBe('Satoshi (SATS)');
  });

  it('falls back to the uppercased code alone when no name is found, never empty', () => {
    expect(currencyDisplayName('eos', [])).toBe('EOS');
  });

  it('prefers a coin match over the static fiat table when a code coincidentally exists in both (real crypto tickers take priority)', () => {
    const coins = [buildCoin({ symbol: 'usd', name: 'Not A Real Coin' })];
    expect(currencyDisplayName('usd', coins)).toBe('Not A Real Coin (USD)');
  });
});
