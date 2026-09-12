import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ASSUMED_ITEM_WIDTH,
  MarketTicker,
  MIN_VIEWPORT_WIDTH,
  REFRESH_INTERVAL_MS,
  TICKER_COIN_COUNT,
} from './market-ticker';
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

describe('MarketTicker', () => {
  let getMarketsSpy: ReturnType<typeof vi.fn>;

  // The component's constructor calls fetchCoins() immediately (and
  // registers its setInterval), so the mock's resolved/rejected value
  // and fake timers (when a test needs them) must be set up BEFORE
  // TestBed.createComponent() runs, not after. Each test configures
  // getMarketsSpy (and vi.useFakeTimers(), where relevant) itself, then
  // calls createFixture().
  beforeEach(async () => {
    getMarketsSpy = vi.fn().mockResolvedValue([buildCoin()]);

    await TestBed.configureTestingModule({
      imports: [MarketTicker],
      providers: [
        {
          provide: CoinGeckoService,
          useValue: { getMarkets: getMarketsSpy },
        },
      ],
    }).compileComponents();
  });

  function createFixture(): ComponentFixture<MarketTicker> {
    const fixture = TestBed.createComponent(MarketTicker);
    fixture.detectChanges();
    return fixture;
  }

  it('TICKER_COIN_COUNT * ASSUMED_ITEM_WIDTH covers the assumed minimum viewport width', () => {
    // The invariant this component's marquee relies on: one full set of
    // coins must be at least as wide as the viewport, or the duplicated
    // set (for the seamless loop) could show the same coin twice at once.
    expect(TICKER_COIN_COUNT * ASSUMED_ITEM_WIDTH).toBeGreaterThanOrEqual(MIN_VIEWPORT_WIDTH);
  });

  it('should create and fetch coins on init', () => {
    createFixture();
    expect(getMarketsSpy).toHaveBeenCalledWith('usd', TICKER_COIN_COUNT);
  });

  it('duplicates the fetched coins once for the seamless marquee loop', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.trackCoins().length).toBe(component.coins().length * 2);
  });

  it('colors a positive-change coin green', async () => {
    getMarketsSpy.mockResolvedValue([buildCoin({ changePercentage24h: 4.21 })]);
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    const changeEl = (fixture.nativeElement as HTMLElement).querySelector('span.text-green-600');
    expect(changeEl).toBeTruthy();
  });

  it('colors a negative-change coin red', async () => {
    getMarketsSpy.mockResolvedValue([buildCoin({ changePercentage24h: -2.5 })]);
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    const changeEl = (fixture.nativeElement as HTMLElement).querySelector('span.text-red-600');
    expect(changeEl).toBeTruthy();
  });

  it('shows a loading coin-spinner before the first response arrives', () => {
    // Deliberately never resolved within this test: detectChanges() runs
    // synchronously, before the pending promise has any chance to settle.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    getMarketsSpy.mockReturnValue(new Promise(() => {}));
    const fixture = createFixture();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Loading...');
  });

  it('shows an error coin-spinner when the fetch rejects, with retry wired to refetch', async () => {
    getMarketsSpy.mockRejectedValueOnce(new Error('network error'));
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Could not load market data.');

    getMarketsSpy.mockResolvedValue([buildCoin()]);
    const retryButton = nativeElement.querySelector('button') as HTMLButtonElement;
    retryButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getMarketsSpy).toHaveBeenCalledTimes(2);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Could not load market data.',
    );
  });

  // This app is zoneless (no zone.js dependency at all), so Angular's
  // fakeAsync()/tick() can't be used here (they're a zone.js testing
  // utility). Vitest's own fake timers work independently of Angular's
  // zone, since setInterval is a plain global the component calls
  // directly — but they must be installed BEFORE the component (and its
  // setInterval registration) is created, or the real interval already
  // running is invisible to them.
  it('polls again after REFRESH_INTERVAL_MS elapses', async () => {
    vi.useFakeTimers();
    try {
      const fixture = createFixture();
      expect(getMarketsSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
      expect(getMarketsSpy).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
      expect(getMarketsSpy).toHaveBeenCalledTimes(3);

      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the interval on destroy, no further polling afterwards', async () => {
    vi.useFakeTimers();
    try {
      const fixture = createFixture();
      expect(getMarketsSpy).toHaveBeenCalledTimes(1);

      fixture.destroy();
      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS * 3);

      expect(getMarketsSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never renders coin data via innerHTML', async () => {
    getMarketsSpy.mockResolvedValue([buildCoin({ symbol: '<b>btc</b>' })]);
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('b')).toBeNull();
    expect(nativeElement.textContent).toContain('<b>btc</b>');
  });
});
