import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FieldConfig, FormBuilder } from '@zhunam/form-builder';
import { CoinGeckoService } from '../../services/coingecko';
import { CryptoCoin } from '../../models/coin';
import { currencyDisplayName } from '../../utils/currency-display-name';
import { CoinSpinner } from '../coin-spinner/coin-spinner';

// Reuses getMarkets(), same as market-table, for the "from" dropdown.
// Not CoinGecko's full ~17,000-coin catalog ("lista completa" read as
// "same method as market-table", not literally exhaustive): a plain
// <select> with every coin CoinGecko tracks isn't practical, and the
// top 100 by market cap covers every coin a real user would convert.
const COIN_LIST_SIZE = 100;

export const AMOUNT_DEBOUNCE_MS = 500;

interface ConverterFormValue {
  amount: number | null;
  fromCoinId: string;
  toCurrency: string;
}

@Component({
  selector: 'app-currency-converter',
  imports: [DecimalPipe, CoinSpinner, FormBuilder],
  templateUrl: './currency-converter.html',
  styleUrl: './currency-converter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyConverter {
  private readonly coinGecko = inject(CoinGeckoService);

  private readonly coinsSignal = signal<CryptoCoin[]>([]);
  private readonly currenciesSignal = signal<string[]>([]);
  private readonly listsErrorSignal = signal<string | null>(null);
  private readonly listsRetryTrigger = signal(0);
  readonly coins = this.coinsSignal.asReadonly();
  readonly currencies = this.currenciesSignal.asReadonly();
  readonly listsError = this.listsErrorSignal.asReadonly();

  // Live current selection: updated on every valueChange, read by
  // canSwap()/fromCoin(). Distinct from the *Default signals below,
  // which only feed form-builder's `defaultValue` and are deliberately
  // NOT touched on every keystroke (see fieldsConfig() below for why).
  private readonly currentFromCoinIdSignal = signal('bitcoin');
  private readonly currentToCurrencySignal = signal('usd');
  private latestAmount: number | null = 1;

  // What the NEXT form-builder rebuild should default to. Only changed
  // by onSwapClick() (or the initial value here) — never by ordinary
  // amount typing, or fieldsConfig() would produce a new array on every
  // keystroke, forcing form-builder to rebuild its FormGroup (and the
  // <input> to lose focus) mid-type.
  private readonly amountDefaultSignal = signal(1);
  private readonly fromCoinIdDefaultSignal = signal('bitcoin');
  private readonly toCurrencyDefaultSignal = signal('usd');

  private readonly resultSignal = signal<number | null>(null);
  // The exact form value that produced the current result() — read by
  // the template to display "X COIN = Y CURRENCY" without a mismatch
  // against a newer (not-yet-converted) value already typed/selected.
  private readonly resultForSignal = signal<ConverterFormValue | null>(null);
  private readonly conversionErrorSignal = signal<string | null>(null);
  private readonly conversionLoadingSignal = signal(false);
  readonly result = this.resultSignal.asReadonly();
  readonly resultFor = this.resultForSignal.asReadonly();
  readonly conversionError = this.conversionErrorSignal.asReadonly();
  readonly conversionLoading = this.conversionLoadingSignal.asReadonly();

  private lastProcessedValue: ConverterFormValue | null = null;
  private amountDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  // Rebuilds (a fresh array reference) only when the coin/currency lists
  // load or a swap happens — see the *Default signals' own comment.
  // form-builder's own `formGroup` is itself a computed() over this same
  // `fields()` input, explicitly designed to rebuild on a new reference
  // ("fields() can change at runtime, e.g. a wizard swapping steps" —
  // this is that same mechanism, used here to push swap's new values in,
  // since form-builder's public contract has no direct setValue API).
  readonly fieldsConfig = computed<FieldConfig<ConverterFormValue>[]>(() => [
    {
      key: 'amount',
      label: 'Amount',
      type: 'number',
      defaultValue: this.amountDefaultSignal(),
      validators: {
        required: true,
        // Number.EPSILON, not 0: Validators.min is inclusive, and 0
        // itself must be rejected ("greater than 0", not "at least 0").
        min: Number.EPSILON,
        errorMessages: {
          required: 'Enter a valid number.',
          min: 'Amount must be greater than 0.',
        },
      },
    },
    {
      key: 'fromCoinId',
      label: 'From',
      type: 'select',
      defaultValue: this.fromCoinIdDefaultSignal(),
      options: this.coins().map((coin) => ({
        value: coin.id,
        label: `${coin.name} (${coin.symbol.toUpperCase()})`,
      })),
    },
    {
      key: 'toCurrency',
      label: 'To',
      type: 'select',
      defaultValue: this.toCurrencyDefaultSignal(),
      options: this.currencies().map((currency) => ({
        value: currency,
        label: currencyDisplayName(currency, this.coins()),
      })),
    },
  ]);

  readonly fromCoin = computed(() =>
    this.coins().find((coin) => coin.id === this.currentFromCoinIdSignal()),
  );

  // The coin the *displayed* result() actually used, which can briefly
  // differ from fromCoin() (the live selection) while a newer selection
  // is still mid-flight or debouncing.
  readonly resultForCoin = computed(() =>
    this.coins().find((coin) => coin.id === this.resultFor()?.fromCoinId),
  );

  // Swap needs BOTH directions to produce a real, valid state: the
  // prompt's rule only names checking fromCoin's symbol against
  // vs_currencies, but swapping also needs toCurrency to map back to an
  // actual coin in our (limited, top-100) list, or there'd be nothing
  // valid to set fromCoin to. Most vs_currencies are fiat (usd, eur...)
  // with no matching coin, so this second check is what actually keeps
  // the button meaningful rather than just "enabled but sometimes does
  // nothing."
  readonly canSwap = computed(() => {
    const coin = this.fromCoin();
    if (!coin) return false;
    const symbolIsSupportedCurrency = this.currencies().some(
      (currency) => currency.toLowerCase() === coin.symbol.toLowerCase(),
    );
    const toCurrencyMatchesACoin = this.coins().some(
      (c) => c.symbol.toLowerCase() === this.currentToCurrencySignal().toLowerCase(),
    );
    return symbolIsSupportedCurrency && toCurrencyMatchesACoin;
  });

  constructor() {
    effect(() => {
      this.listsRetryTrigger();
      this.coinGecko.getMarkets('usd', COIN_LIST_SIZE).then(
        (coins) => this.coinsSignal.set(coins),
        () => this.listsErrorSignal.set('Could not load the coin list.'),
      );
      this.coinGecko.getSupportedCurrencies().then(
        (currencies) => this.currenciesSignal.set(currencies),
        () => this.listsErrorSignal.set('Could not load the currency list.'),
      );
    });
  }

  // form-builder only emits a value here once the whole form (native
  // validators + crossFieldValidators, none used here) is valid — an
  // invalid amount never reaches this method at all, which is how the
  // last valid result stays on screen untouched while amount() is
  // invalid (form-builder's own inline error message handles telling
  // the user why, next to the field itself).
  onValueChange(value: ConverterFormValue): void {
    this.currentFromCoinIdSignal.set(value.fromCoinId);
    this.currentToCurrencySignal.set(value.toCurrency);
    this.latestAmount = value.amount;

    const previous = this.lastProcessedValue;
    // form-builder emits the whole form value on every change; it can't
    // tell us which single field changed. Selection changes (discrete,
    // no debounce needed) are detected by diffing against the previous
    // processed value; only a same-selection, amount-only change goes
    // through the debounce below.
    const selectionChanged =
      !previous ||
      previous.fromCoinId !== value.fromCoinId ||
      previous.toCurrency !== value.toCurrency;

    clearTimeout(this.amountDebounceTimer);

    if (selectionChanged) {
      this.lastProcessedValue = value;
      this.triggerConversion(value);
      return;
    }

    this.amountDebounceTimer = setTimeout(() => {
      this.lastProcessedValue = value;
      this.triggerConversion(value);
    }, AMOUNT_DEBOUNCE_MS);
  }

  onSwapClick(): void {
    if (!this.canSwap()) {
      return;
    }
    const coin = this.fromCoin();
    const matchingCoin = this.coins().find(
      (c) => c.symbol.toLowerCase() === this.currentToCurrencySignal().toLowerCase(),
    );
    if (!coin || !matchingCoin) {
      return;
    }
    this.amountDefaultSignal.set(this.latestAmount ?? 1);
    this.fromCoinIdDefaultSignal.set(matchingCoin.id);
    this.toCurrencyDefaultSignal.set(coin.symbol.toLowerCase());
  }

  onRetryListsClick(): void {
    this.listsRetryTrigger.update((n) => n + 1);
  }

  onRetryConversionClick(): void {
    if (this.lastProcessedValue) {
      this.triggerConversion(this.lastProcessedValue);
    }
  }

  private triggerConversion(value: ConverterFormValue): void {
    if (value.amount === null) {
      return;
    }
    const amount = value.amount;
    this.conversionLoadingSignal.set(true);
    this.coinGecko.getSimplePrice(value.fromCoinId, value.toCurrency).then(
      (rate) => {
        this.resultSignal.set(amount * rate);
        this.resultForSignal.set(value);
        this.conversionErrorSignal.set(null);
        this.conversionLoadingSignal.set(false);
      },
      () => {
        this.conversionErrorSignal.set('Could not load the conversion rate.');
        this.conversionLoadingSignal.set(false);
      },
    );
  }
}
