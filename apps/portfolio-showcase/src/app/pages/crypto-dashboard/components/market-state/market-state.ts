import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CoinGeckoService } from '../../services/coingecko';
import { GlobalMarketStats } from '../../models/coin';
import { priceDirection } from '../../utils/price-direction';
import { CoinSpinner } from '../coin-spinner/coin-spinner';

type ChangeColor = 'text-green-600' | 'text-red-600' | 'text-slate-600';

@Component({
  selector: 'app-market-state',
  imports: [DecimalPipe, CoinSpinner],
  templateUrl: './market-state.html',
  styleUrl: './market-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketState {
  private readonly coinGecko = inject(CoinGeckoService);

  private readonly statsSignal = signal<GlobalMarketStats | null>(null);
  private readonly currenciesSignal = signal<string[]>([]);
  private readonly errorSignal = signal<string | null>(null);
  private readonly retryTrigger = signal(0);
  readonly stats = this.statsSignal.asReadonly();
  readonly currencies = this.currenciesSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Independent from currency-converter's own selector: separate
  // component, separate state, changing one never affects the other.
  private readonly currencySignal = signal('usd');
  readonly currency = this.currencySignal.asReadonly();

  // Both read a key out of the SAME /global response already fetched
  // below — switching currency() is a pure object-key lookup, never a
  // new API call.
  readonly totalMarketCap = computed(() => this.stats()?.totalMarketCapByCurrency[this.currency()]);
  readonly totalVolume = computed(() => this.stats()?.totalVolumeByCurrency[this.currency()]);

  readonly dominanceEntries = computed(() => Object.entries(this.stats()?.dominanceByCoin ?? {}));

  // market_cap_change_percentage_24h_usd / volume_change_percentage_24h_usd
  // are fixed in USD by CoinGecko regardless of currency() — confirmed in
  // ROADMAP.md, no per-currency variant exists. Shown with an explicit
  // "(USD)" label in the template so it doesn't read as if it tracked
  // the selector.
  readonly marketCapChangeColor = computed<ChangeColor>(() =>
    this.colorFor(this.stats()?.marketCapChangePercentage24hUsd ?? 0),
  );
  readonly volumeChangeColor = computed<ChangeColor>(() =>
    this.colorFor(this.stats()?.volumeChangePercentage24hUsd ?? 0),
  );

  constructor() {
    effect(() => {
      this.retryTrigger();
      this.coinGecko.getGlobalStats().then(
        (stats) => {
          this.statsSignal.set(stats);
          this.errorSignal.set(null);
        },
        () => this.errorSignal.set('Could not load global market stats.'),
      );
      // Same cached, deduped call currency-converter also makes: the
      // service's own 45s cache (keyed by endpoint, no params here)
      // serves whichever component asks second from that cache, no
      // second real fetch — no need for a separate shared-list method.
      this.coinGecko.getSupportedCurrencies().then(
        (currencies) => this.currenciesSignal.set(currencies),
        () => this.errorSignal.set('Could not load the currency list.'),
      );
    });
  }

  onCurrencyChange(event: Event): void {
    this.currencySignal.set((event.target as HTMLSelectElement).value);
  }

  onRetryClick(): void {
    this.retryTrigger.update((n) => n + 1);
  }

  private colorFor(change: number): ChangeColor {
    switch (priceDirection(change)) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  }
}
