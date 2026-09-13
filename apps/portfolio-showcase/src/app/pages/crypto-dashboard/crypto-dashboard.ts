import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CoinGeckoService } from './services/coingecko';
import { CryptoCoin, TrendingCoin } from './models/coin';
import { CoinSpinner } from './components/coin-spinner/coin-spinner';
import { PriceTicker } from './components/price-ticker/price-ticker';
import { MarketTicker } from './components/market-ticker/market-ticker';
import { MarketTable } from './components/market-table/market-table';
import { TrendingCarousel } from './components/trending-carousel/trending-carousel';
import { CurrencyConverter } from './components/currency-converter/currency-converter';
import { MarketState } from './components/market-state/market-state';

// A reasonable dashboard table size, distinct from market-ticker's own
// TICKER_COIN_COUNT (that one is sized to fill a marquee, this is sized
// to be a readable table).
const MARKET_TABLE_SIZE = 20;

@Component({
  selector: 'app-crypto-dashboard',
  imports: [
    RouterLink,
    CoinSpinner,
    PriceTicker,
    MarketTicker,
    MarketTable,
    TrendingCarousel,
    CurrencyConverter,
    MarketState,
  ],
  templateUrl: './crypto-dashboard.html',
  styleUrl: './crypto-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CryptoDashboard {
  private readonly coinGecko = inject(CoinGeckoService);

  private readonly marketCoinsSignal = signal<CryptoCoin[]>([]);
  private readonly marketErrorSignal = signal<string | null>(null);
  private readonly marketRetryTrigger = signal(0);
  readonly marketCoins = this.marketCoinsSignal.asReadonly();
  readonly marketError = this.marketErrorSignal.asReadonly();

  // price-ticker's contract is a single required CryptoCoin (no
  // built-in empty/loading state of its own, unlike the list-based
  // components) — reuses market-table's own top entry (BTC, since
  // /coins/markets is requested market-cap-desc) instead of a
  // redundant second fetch for the same shape of data.
  readonly featuredCoin = computed(() => this.marketCoins()[0]);

  private readonly trendingCoinsSignal = signal<TrendingCoin[]>([]);
  private readonly trendingErrorSignal = signal<string | null>(null);
  private readonly trendingRetryTrigger = signal(0);
  readonly trendingCoins = this.trendingCoinsSignal.asReadonly();
  readonly trendingError = this.trendingErrorSignal.asReadonly();

  constructor() {
    effect(() => {
      this.marketRetryTrigger();
      this.coinGecko.getMarkets('usd', MARKET_TABLE_SIZE).then(
        (coins) => {
          this.marketCoinsSignal.set(coins);
          this.marketErrorSignal.set(null);
        },
        () => this.marketErrorSignal.set('Could not load market data.'),
      );
    });

    effect(() => {
      this.trendingRetryTrigger();
      this.coinGecko.getTrending().then(
        (coins) => {
          this.trendingCoinsSignal.set(coins);
          this.trendingErrorSignal.set(null);
        },
        () => this.trendingErrorSignal.set('Could not load trending coins.'),
      );
    });
  }

  onMarketRetry(): void {
    this.marketRetryTrigger.update((n) => n + 1);
  }

  onTrendingRetry(): void {
    this.trendingRetryTrigger.update((n) => n + 1);
  }
}
