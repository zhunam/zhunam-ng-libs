import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CoinGeckoService } from '../../services/coingecko';
import { CryptoCoin, GlobalMarketStats } from '../../models/coin';
import { priceDirection } from '../../utils/price-direction';
import { currencyDisplayName } from '../../utils/currency-display-name';
import { CoinSpinner } from '../coin-spinner/coin-spinner';

type ChangeColor = 'text-green-600' | 'text-red-600' | 'text-slate-600';

// Same call (path + params) currency-converter already makes for its
// own "From" coin list: CoinGeckoService's 45s cache is keyed by
// endpoint + params, so whichever of the two components asks second
// gets served from that cache, no second real fetch. Kept as a
// duplicated literal (not imported from currency-converter, see
// AGENTS.md's "Independence between libraries" reasoning applied here
// at the component level too) — the two components share nothing but
// this incidental cache-key match.
const COIN_LIST_SIZE = 100;

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
  private readonly coinsSignal = signal<CryptoCoin[]>([]);
  private readonly errorSignal = signal<string | null>(null);
  private readonly retryTrigger = signal(0);
  readonly stats = this.statsSignal.asReadonly();
  readonly currencies = this.currenciesSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // "Name (CODE)" for the reference-currency selector, e.g.
  // "Bitcoin (BTC)" or "US Dollar (USD)"; see currencyDisplayName's own
  // doc comment for how crypto tickers vs. fiat/other codes resolve.
  readonly currencyOptions = computed(() =>
    this.currencies().map((code) => ({ code, label: currencyDisplayName(code, this.coinsSignal()) })),
  );

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
      // Same reasoning as getSupportedCurrencies() above, same exact
      // params currency-converter uses for its own coin list: only
      // used here to resolve a crypto ticker's full name for the
      // selector, never rendered as a coin list of its own. A failure
      // here is deliberately swallowed, not routed to errorSignal: it's
      // a cosmetic enrichment (currencyDisplayName() already falls back
      // to the plain code with no match), not core to this widget, so
      // it must never block or error out stats/currencies over it.
      this.coinGecko.getMarkets('usd', COIN_LIST_SIZE).then(
        (coins) => this.coinsSignal.set(coins),
        () => undefined,
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
