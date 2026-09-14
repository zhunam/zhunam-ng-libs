import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { CoinGeckoService } from '../../services/coingecko';
import { CryptoCoin } from '../../models/coin';
import { priceDirection } from '../../utils/price-direction';
import { CoinSpinner } from '../coin-spinner/coin-spinner';

// The marquee track renders one full set of coins twice back to back
// (for a seamless loop). To never show the same coin in both copies on
// screen at once, one set's total width must be at least as wide as the
// viewport. Assumed a 1280px minimum viewport, and a deliberately
// conservative (smaller than realistic) ~120px per text-only item
// (symbol + price + change) — underestimating item width rounds this UP
// to a safer (larger) coin count than a looser estimate would.
export const MIN_VIEWPORT_WIDTH = 1280;
export const ASSUMED_ITEM_WIDTH = 120;
export const TICKER_COIN_COUNT = Math.ceil(MIN_VIEWPORT_WIDTH / ASSUMED_ITEM_WIDTH);

// Slightly above CoinGeckoService's own 45s cache TTL: polling exactly
// at the TTL risks a poll landing a moment before expiry (timer drift),
// hitting the still-cached value for an API round trip that returns no
// new data.
export const REFRESH_INTERVAL_MS = 50_000;

type ChangeColor = 'text-green-600' | 'text-red-600' | 'text-slate-600';

@Component({
  selector: 'app-market-ticker',
  imports: [CurrencyPipe, DecimalPipe, CoinSpinner],
  templateUrl: './market-ticker.html',
  styleUrl: './market-ticker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketTicker {
  private readonly coinGecko = inject(CoinGeckoService);

  private readonly coinsSignal = signal<CryptoCoin[]>([]);
  private readonly errorSignal = signal<string | null>(null);
  readonly coins = this.coinsSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Duplicated once for the seamless marquee loop; see TICKER_COIN_COUNT
  // above for why one set is already wide enough to never repeat visibly.
  readonly trackCoins = computed(() => [...this.coins(), ...this.coins()]);

  constructor() {
    this.fetchCoins();

    const intervalId = setInterval(() => this.fetchCoins(), REFRESH_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }

  onRetryClick(): void {
    this.fetchCoins();
  }

  changeColorFor(coin: CryptoCoin): ChangeColor {
    switch (priceDirection(coin.changePercentage24h)) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  }

  private fetchCoins(): void {
    this.coinGecko.getMarkets('usd', TICKER_COIN_COUNT).then(
      (coins) => {
        this.coinsSignal.set(coins);
        this.errorSignal.set(null);
      },
      () => {
        this.errorSignal.set('Could not load market data.');
      },
    );
  }
}
