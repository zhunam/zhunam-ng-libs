import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@zhunam/form-builder';
import { AMOUNT_DEBOUNCE_MS, CurrencyConverter } from './currency-converter';
import { CoinGeckoService } from '../../services/coingecko';
import { CryptoCoin } from '../../models/coin';

function buildCoin(overrides: Partial<CryptoCoin> = {}): CryptoCoin {
  return {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    currentPrice: 65000,
    rank: 1,
    changePercentage24h: 0,
    sparkline: [],
    ...overrides,
  };
}

const sampleCoins: CryptoCoin[] = [
  buildCoin({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }),
  buildCoin({ id: 'ethereum', symbol: 'eth', name: 'Ethereum' }),
];
// "eur" has no matching coin above on purpose, for the swap-disabled case.
// Order matters for the *_INDEX constants below: usd=0, eur=1, eth=2, btc=3.
const sampleCurrencies = ['usd', 'eur', 'eth', 'btc'];

const BITCOIN_INDEX = 0;
const ETHEREUM_INDEX = 1;
const USD_INDEX = 0;
const ETH_CURRENCY_INDEX = 2;
const BTC_CURRENCY_INDEX = 3;

function root(fixture: ComponentFixture<CurrencyConverter>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function getAmountInput(fixture: ComponentFixture<CurrencyConverter>): HTMLInputElement {
  return root(fixture).querySelector('input[type="number"]') as HTMLInputElement;
}

function getSelects(fixture: ComponentFixture<CurrencyConverter>): HTMLSelectElement[] {
  return Array.from(root(fixture).querySelectorAll('select'));
}

function getSwapButton(fixture: ComponentFixture<CurrencyConverter>): HTMLButtonElement {
  return root(fixture).querySelector('button[aria-label="Swap currencies"]') as HTMLButtonElement;
}

function setAmount(fixture: ComponentFixture<CurrencyConverter>, value: string): void {
  const input = getAmountInput(fixture);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

// form-builder only reveals a field's error once it's `touched` (or the
// form submitted) — real Angular reactive-forms behavior, set on blur,
// never on `input` alone. A real user would eventually blur the field;
// this simulates that instead of asserting on an error that (correctly,
// per form-builder's own existing, unmodified design) isn't shown yet.
function blur(el: HTMLElement, fixture: ComponentFixture<CurrencyConverter>): void {
  el.dispatchEvent(new Event('blur'));
  fixture.detectChanges();
}

// form-builder's <option> uses Angular's [ngValue] binding (needed to
// support non-string option values elsewhere in the library), which
// Angular tracks internally as "index: value" rather than a plain
// string — confirmed against form-builder's own spec, which selects by
// `selectedIndex`, never `.value`, for exactly this reason.
function selectByIndex(
  select: HTMLSelectElement,
  index: number,
  fixture: ComponentFixture<CurrencyConverter>,
): void {
  select.selectedIndex = index;
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

describe('CurrencyConverter', () => {
  let getMarketsSpy: ReturnType<typeof vi.fn>;
  let getSupportedCurrenciesSpy: ReturnType<typeof vi.fn>;
  let getSimplePriceSpy: ReturnType<typeof vi.fn>;

  // Same lesson as market-ticker/form-builder: fake timers must be
  // installed before TestBed.createComponent() runs, since form-builder
  // (in 'live' mode) and this component's own debounce logic both
  // register effects/timers as soon as they're constructed/first fire.
  beforeEach(async () => {
    vi.useFakeTimers();
    getMarketsSpy = vi.fn().mockResolvedValue(sampleCoins);
    getSupportedCurrenciesSpy = vi.fn().mockResolvedValue(sampleCurrencies);
    getSimplePriceSpy = vi.fn().mockResolvedValue(65000);

    await TestBed.configureTestingModule({
      imports: [CurrencyConverter, FormBuilder],
      providers: [
        {
          provide: CoinGeckoService,
          useValue: {
            getMarkets: getMarketsSpy,
            getSupportedCurrencies: getSupportedCurrenciesSpy,
            getSimplePrice: getSimplePriceSpy,
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function createSettledFixture(): Promise<ComponentFixture<CurrencyConverter>> {
    const fixture = TestBed.createComponent(CurrencyConverter);
    fixture.detectChanges();
    // Flushes: the lists' promises, form-builder's initial 'live'
    // emission, and this component's own initial (non-debounced, since
    // it's the first "selection") conversion call.
    await vi.advanceTimersByTimeAsync(AMOUNT_DEBOUNCE_MS);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', async () => {
    const fixture = await createSettledFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders via lib-form-builder in mode "live", not native inputs/selects of its own', async () => {
    const fixture = await createSettledFixture();

    expect(root(fixture).querySelector('lib-form-builder')).toBeTruthy();
    // Exactly the 3 controls form-builder itself renders (amount + 2
    // selects) — confirms currency-converter isn't mixing in its own
    // native <input>/<select> alongside form-builder's.
    expect(root(fixture).querySelectorAll('input[type="number"]').length).toBe(1);
    expect(getSelects(fixture).length).toBe(2);
  });

  it('shows the converted result for the default amount/coin/currency', async () => {
    const fixture = await createSettledFixture();

    expect(getSimplePriceSpy).toHaveBeenCalledWith('bitcoin', 'usd');
    const text = root(fixture).textContent ?? '';
    expect(text).toContain('65,000');
  });

  it('shows an error message (on blur) and keeps the last valid result when amount is 0, never emitting a new conversion', async () => {
    const fixture = await createSettledFixture();
    getSimplePriceSpy.mockClear();

    setAmount(fixture, '0');
    await vi.advanceTimersByTimeAsync(AMOUNT_DEBOUNCE_MS);
    blur(getAmountInput(fixture), fixture);

    expect(root(fixture).textContent).toContain('Amount must be greater than 0.');
    expect(getAmountInput(fixture).value).toBe('0'); // never cleared
    expect(getSimplePriceSpy).not.toHaveBeenCalled(); // form-builder never emitted an invalid value
  });

  it('shows an error message (on blur) for non-numeric amount', async () => {
    const fixture = await createSettledFixture();
    getSimplePriceSpy.mockClear();

    setAmount(fixture, 'abc');
    await vi.advanceTimersByTimeAsync(AMOUNT_DEBOUNCE_MS);
    blur(getAmountInput(fixture), fixture);

    expect(root(fixture).textContent).toContain('Enter a valid number.');
    expect(getSimplePriceSpy).not.toHaveBeenCalled();
  });

  it('debounces rapid amount changes into a single real conversion call', async () => {
    const fixture = await createSettledFixture();
    getSimplePriceSpy.mockClear();

    for (const digit of ['2', '25', '250']) {
      setAmount(fixture, digit);
      await vi.advanceTimersByTimeAsync(AMOUNT_DEBOUNCE_MS / 2); // well within the debounce window
    }

    expect(getSimplePriceSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(AMOUNT_DEBOUNCE_MS);
    fixture.detectChanges();

    expect(getSimplePriceSpy).toHaveBeenCalledTimes(1);
    expect(getSimplePriceSpy).toHaveBeenCalledWith('bitcoin', 'usd');
  });

  it('a selection change (select) triggers conversion immediately, without waiting for the amount debounce', async () => {
    const fixture = await createSettledFixture();
    getSimplePriceSpy.mockClear();

    const [, toCurrencySelect] = getSelects(fixture);
    selectByIndex(toCurrencySelect, ETH_CURRENCY_INDEX, fixture);
    await vi.advanceTimersByTimeAsync(0); // no debounce expected, just promise microtasks
    fixture.detectChanges();

    expect(getSimplePriceSpy).toHaveBeenCalledWith('bitcoin', 'eth');
  });

  it('enables swap when fromCoin.symbol exists in vs_currencies AND toCurrency maps back to a coin', async () => {
    const fixture = await createSettledFixture();
    const component = fixture.componentInstance;

    // Default: bitcoin -> usd. "usd" has no matching coin, so disabled.
    expect(component.canSwap()).toBe(false);
    expect(getSwapButton(fixture).disabled).toBe(true);

    const [, toCurrencySelect] = getSelects(fixture);
    selectByIndex(toCurrencySelect, ETH_CURRENCY_INDEX, fixture);
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    // bitcoin -> eth: "btc" is a supported currency AND "eth" matches ethereum.
    expect(component.canSwap()).toBe(true);
    expect(getSwapButton(fixture).disabled).toBe(false);
  });

  it('swap click does nothing when disabled', async () => {
    const fixture = await createSettledFixture();
    const component = fixture.componentInstance;
    expect(component.canSwap()).toBe(false);

    getSwapButton(fixture).click();
    fixture.detectChanges();

    const selects = getSelects(fixture);
    expect(selects[0].selectedIndex).toBe(BITCOIN_INDEX);
    expect(selects[1].selectedIndex).toBe(USD_INDEX);
  });

  it('swap exchanges fromCoin and toCurrency when enabled, preserving the current amount', async () => {
    const fixture = await createSettledFixture();

    const [, toCurrencySelect] = getSelects(fixture);
    selectByIndex(toCurrencySelect, ETH_CURRENCY_INDEX, fixture);
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    setAmount(fixture, '3');
    await vi.advanceTimersByTimeAsync(AMOUNT_DEBOUNCE_MS);
    fixture.detectChanges();
    getSimplePriceSpy.mockClear();

    getSwapButton(fixture).click();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    const selects = getSelects(fixture);
    expect(selects[0].selectedIndex).toBe(ETHEREUM_INDEX);
    expect(selects[1].selectedIndex).toBe(BTC_CURRENCY_INDEX);
    expect(getAmountInput(fixture).value).toBe('3'); // preserved across the swap-triggered rebuild
    expect(getSimplePriceSpy).toHaveBeenCalledWith('ethereum', 'btc');
  });

  it('shows a loading coin-spinner while the coin/currency lists are still loading', () => {
    getMarketsSpy.mockReturnValue(new Promise<never>(() => undefined));
    const fixture = TestBed.createComponent(CurrencyConverter);
    fixture.detectChanges();

    expect(root(fixture).textContent).toContain('Loading...');
  });

  it('shows an error coin-spinner when the lists fail to load', async () => {
    getSupportedCurrenciesSpy.mockRejectedValue(new Error('network error'));
    const fixture = TestBed.createComponent(CurrencyConverter);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(root(fixture).textContent).toContain('Could not load the currency list.');
  });

  it('renders the "To" select with "Name (CODE)" labels, crypto tickers and fiat alike', async () => {
    const fixture = await createSettledFixture();

    const [, toCurrencySelect] = getSelects(fixture);
    const optionLabels = Array.from(toCurrencySelect.options).map((option) => option.textContent?.trim());
    // sampleCurrencies = ['usd', 'eur', 'eth', 'btc']; 'eth'/'btc' match
    // sampleCoins, 'usd'/'eur' resolve from the static fiat table.
    expect(optionLabels).toEqual(['US Dollar (USD)', 'Euro (EUR)', 'Ethereum (ETH)', 'Bitcoin (BTC)']);
  });

  it('never renders coin/currency data via innerHTML', async () => {
    getMarketsSpy.mockResolvedValue([buildCoin({ name: '<b>Bitcoin</b>' })]);
    const fixture = await createSettledFixture();

    expect(root(fixture).querySelector('b')).toBeNull();
    expect(root(fixture).textContent).toContain('<b>Bitcoin</b>');
  });
});
