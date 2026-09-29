import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { CryptoCoin } from '../../models/coin';
import { priceDirection } from '../../utils/price-direction';
import { CoinSpinner } from '../coin-spinner/coin-spinner';

type ChangeColor = 'text-green-600' | 'text-red-600' | 'text-slate-600';

@Component({
  selector: 'app-market-ticker',
  imports: [CurrencyPipe, DecimalPipe, CoinSpinner],
  templateUrl: './market-ticker.html',
  styleUrl: './market-ticker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketTicker {
  coins = input.required<CryptoCoin[]>();
  error = input<string | null>(null);

  retry = output<void>();

  // Duplicated once for the seamless marquee loop; see crypto-dashboard.ts's
  // TICKER_COIN_COUNT for why the page always sends enough coins to never
  // repeat visibly (this component no longer decides that count itself,
  // it renders whatever it's given).
  readonly trackCoins = computed(() => [...this.coins(), ...this.coins()]);

  onRetryClick(): void {
    this.retry.emit();
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
}
