import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FieldConfig, FormBuilder } from '@zhunam/form-builder';
import { CoinGeckoService } from '../../services/coingecko';
import { CryptoCoin } from '../../models/coin';
import { currencyDisplayName } from '../../utils/currency-display-name';
import { CoinSpinner } from '../coin-spinner/coin-spinner';

export const AMOUNT_DEBOUNCE_MS = 500;

const INITIAL_AMOUNT = 1;
const INITIAL_FROM_COIN_ID = 'bitcoin';
const INITIAL_TO_CURRENCY = 'usd';

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

  // The "from" coin list: fetched once by the page (crypto-dashboard.ts)
  // and shared across market-table/market-ticker/this component, instead
  // of each of them calling getMarkets() with its own count. error/retry
  // here cover only that shared fetch; getSupportedCurrencies() below
  // stays this component's own concern, with its own error/retry.
  coins = input.required<CryptoCoin[]>();
  error = input<string | null>(null);
  retry = output<void>();

  private readonly currenciesSignal = signal<string[]>([]);
  private readonly currenciesErrorSignal = signal<string | null>(null);
  private readonly currenciesRetryTrigger = signal(0);
  readonly currencies = this.currenciesSignal.asReadonly();

  // Combines both independent failure sources behind the one coin-spinner
  // the template already renders: the page's shared coin list and this
  // component's own currency list. Whichever is set is shown; a real user
  // just sees "something didn't load" and clicks the one Retry button,
  // which retries both (see onRetryListsClick()).
  readonly listsError = computed(() => this.error() ?? this.currenciesErrorSignal());

  // Live current selection: updated on every valueChange, read by
  // canSwap()/fromCoin().
  private readonly currentFromCoinIdSignal = signal(INITIAL_FROM_COIN_ID);
  private readonly currentToCurrencySignal = signal(INITIAL_TO_CURRENCY);
  private latestAmount: number | null = INITIAL_AMOUNT;

  // Fed into form-builder's `value` input to apply a swap without
  // rebuilding `fields()`. Stays `undefined` until the first swap; each
  // later swap sets a fresh object, which is what makes form-builder's
  // value-patch effect fire again (see FormBuilder.value's own JSDoc).
  private readonly swapValueSignal = signal<ConverterFormValue | undefined>(undefined);
  readonly swapValue = this.swapValueSignal.asReadonly();

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
  // load, never on a swap: a swap now goes through the `value` input
  // instead (see swapValueSignal and onSwapClick()), so form-builder
  // preserves whatever the user already typed instead of resetting the
  // whole FormGroup. `defaultValue` here is only the form's initial
  // state, before the user or a swap ever touches it.
  readonly fieldsConfig = computed<FieldConfig<ConverterFormValue>[]>(() => [
    {
      key: 'amount',
      label: 'Amount',
      type: 'number',
      defaultValue: INITIAL_AMOUNT,
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
      defaultValue: INITIAL_FROM_COIN_ID,
      options: this.coins().map((coin) => ({
        value: coin.id,
        label: `${coin.name} (${coin.symbol.toUpperCase()})`,
      })),
    },
    {
      key: 'toCurrency',
      label: 'To',
      type: 'select',
      defaultValue: INITIAL_TO_CURRENCY,
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
      this.currenciesRetryTrigger();
      this.coinGecko.getSupportedCurrencies().then(
        (currencies) => {
          this.currenciesSignal.set(currencies);
          this.currenciesErrorSignal.set(null);
        },
        () => this.currenciesErrorSignal.set('Could not load the currency list.'),
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
    const swapped: ConverterFormValue = {
      amount: this.latestAmount ?? INITIAL_AMOUNT,
      fromCoinId: matchingCoin.id,
      toCurrency: coin.symbol.toLowerCase(),
    };
    // `swapValueSignal` only keeps the displayed form controls (amount,
    // both selects) in sync via `value`/patchValue, which deliberately
    // never emits `valueChange` (see FormBuilder.value's own JSDoc).
    // The conversion itself, and the current-selection signals it reads,
    // still need driving directly, the same way a real user's own
    // selection would through onValueChange().
    this.swapValueSignal.set(swapped);
    this.onValueChange(swapped);
  }

  onRetryListsClick(): void {
    this.retry.emit();
    this.currenciesRetryTrigger.update((n) => n + 1);
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
