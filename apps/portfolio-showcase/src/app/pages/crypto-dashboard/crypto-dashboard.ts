import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { CoinGeckoService } from './services/coingecko';
import { CryptoCoin, TrendingCoin } from './models/coin';
import { priceDirection } from './utils/price-direction';
import { MarketTicker } from './components/market-ticker/market-ticker';
import { MarketTable } from './components/market-table/market-table';
import { TrendingCarousel } from './components/trending-carousel/trending-carousel';
import { CurrencyConverter } from './components/currency-converter/currency-converter';
import { MarketState } from './components/market-state/market-state';

// A reasonable dashboard table size, distinct from market-ticker's own
// TICKER_COIN_COUNT (that one is sized to fill a marquee, this is sized
// to be a readable table).
const MARKET_TABLE_SIZE = 20;

// Mirrors trending-carousel's own sparkline constants: duplicated here
// (not imported/shared) since this task's scope doesn't allow touching
// that component's file, see DESIGN.md "Crypto Dashboard (page-specific
// register)".
const HERO_SPARKLINE_WIDTH = 100;
const HERO_SPARKLINE_HEIGHT = 32;

@Component({
  selector: 'app-crypto-dashboard',
  imports: [
    CurrencyPipe,
    DecimalPipe,
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
  // Exposed for the template's viewBox binding (the ambient sparkline
  // background's mask/gradient rects need the same numeric bounds).
  readonly heroSparklineWidth = HERO_SPARKLINE_WIDTH;
  readonly heroSparklineHeight = HERO_SPARKLINE_HEIGHT;

  private readonly coinGecko = inject(CoinGeckoService);

  private readonly marketCoinsSignal = signal<CryptoCoin[]>([]);
  private readonly marketErrorSignal = signal<string | null>(null);
  private readonly marketRetryTrigger = signal(0);
  readonly marketCoins = this.marketCoinsSignal.asReadonly();
  readonly marketError = this.marketErrorSignal.asReadonly();

  // The hero's featured coin reuses market-table's own top entry (BTC,
  // since /coins/markets is requested market-cap-desc) instead of a
  // redundant second fetch for the same shape of data.
  readonly featuredCoin = computed(() => this.marketCoins()[0]);

  // Page-level presentation only (reuses the existing helper, doesn't
  // duplicate its logic): colors the hero's 24h change the same way
  // price-ticker/market-table already do. The neutral case is swapped
  // for text-slate-300 instead of text-slate-600: this hero sits on the
  // dark Ink surface, and slate-600 (tuned for white panels) fails
  // contrast there, see DESIGN.md.
  readonly heroChangeColor = computed<'text-green-600' | 'text-red-600' | 'text-slate-300'>(() => {
    const coin = this.featuredCoin();
    if (!coin) return 'text-slate-300';
    switch (priceDirection(coin.changePercentage24h)) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-300';
    }
  });

  readonly heroLinePath = computed(() => {
    const points = this.heroSparklinePoints();
    if (points.length === 0) {
      return '';
    }
    return `M${points[0].x},${points[0].y} L${points
      .slice(1)
      .map((p) => `${p.x},${p.y}`)
      .join(' L')}`;
  });

  readonly heroAreaPath = computed(() => {
    const line = this.heroLinePath();
    if (!line) {
      return '';
    }
    return `${line} L${HERO_SPARKLINE_WIDTH},${HERO_SPARKLINE_HEIGHT} L0,${HERO_SPARKLINE_HEIGHT} Z`;
  });

  private readonly heroSparklinePoints = computed<{ x: number; y: number }[]>(() => {
    const values = this.featuredCoin()?.sparkline ?? [];
    if (values.length < 2) {
      return [];
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map((value, index) => ({
      x: (index / (values.length - 1)) * HERO_SPARKLINE_WIDTH,
      y: HERO_SPARKLINE_HEIGHT - ((value - min) / range) * HERO_SPARKLINE_HEIGHT,
    }));
  });

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
