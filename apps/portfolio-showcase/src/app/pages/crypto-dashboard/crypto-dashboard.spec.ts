import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  buildPdfReportData,
  CryptoDashboard,
  formatDateForFilename,
  MARKET_TABLE_SIZE,
  REFRESH_INTERVAL_MS,
} from './crypto-dashboard';
import { CoinGeckoService } from './services/coingecko';
import { CryptoCoin, GlobalMarketStats } from './models/coin';

function buildCoin(overrides: Partial<CryptoCoin> = {}): CryptoCoin {
  return {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    currentPrice: 65000,
    rank: 1,
    changePercentage24h: 1.5,
    sparkline: [64000, 64500, 65000],
    ...overrides,
  };
}

const sampleStats: GlobalMarketStats = {
  totalMarketCapByCurrency: { usd: 2_654_490_015_954.5 },
  totalVolumeByCurrency: { usd: 107_207_728_882.8 },
  marketCapChangePercentage24hUsd: -2.43,
  volumeChangePercentage24hUsd: 5.12,
  dominanceByCoin: { btc: 58.17, eth: 11.65 },
  activeCryptocurrencies: 21084,
};

describe('CryptoDashboard', () => {
  let fixture: ComponentFixture<CryptoDashboard>;
  let getMarketsSpy: ReturnType<typeof vi.fn>;
  let getTrendingSpy: ReturnType<typeof vi.fn>;
  let getGlobalStatsSpy: ReturnType<typeof vi.fn>;

  // This page assembles several components that each inject
  // CoinGeckoService independently (market-ticker, currency-converter,
  // market-state) — one shared mock, provided once at the TestBed level,
  // covers all of them, same instance Angular's DI hands to every
  // consumer in this test.
  function provideMockCoinGecko() {
    getMarketsSpy = vi.fn().mockResolvedValue([buildCoin(), buildCoin({ id: 'ethereum', symbol: 'eth', name: 'Ethereum' })]);
    getTrendingSpy = vi.fn().mockResolvedValue([buildCoin()]);
    getGlobalStatsSpy = vi.fn().mockResolvedValue(sampleStats);
    return {
      provide: CoinGeckoService,
      useValue: {
        getMarkets: getMarketsSpy,
        getTrending: getTrendingSpy,
        getSupportedCurrencies: vi.fn().mockResolvedValue(['usd', 'eur', 'btc', 'eth']),
        getSimplePrice: vi.fn().mockResolvedValue(65000),
        getGlobalStats: getGlobalStatsSpy,
      },
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CryptoDashboard],
      providers: [provideRouter([]), provideMockCoinGecko()],
    }).compileComponents();
  });

  async function createSettledFixture(): Promise<ComponentFixture<CryptoDashboard>> {
    const f = TestBed.createComponent(CryptoDashboard);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return f;
  }

  // getMarketsSpy is shared across every component on this page that
  // independently injects CoinGeckoService (market-ticker, market-state,
  // currency-converter — each with its own distinct count param) AND
  // this page's own effect (MARKET_TABLE_SIZE). Its raw call count
  // mixes all of them; this isolates just the page's own calls by their
  // distinctive ('usd', MARKET_TABLE_SIZE) params. getTrendingSpy has no
  // such aliasing (no other component on this page calls getTrending),
  // so its raw call count is used directly in the tests below.
  function pageMarketFetchCount(): number {
    return getMarketsSpy.mock.calls.filter(
      ([vsCurrency, count]) => vsCurrency === 'usd' && count === MARKET_TABLE_SIZE,
    ).length;
  }

  it('should create', async () => {
    fixture = await createSettledFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders every assembled component on the real route page (integration, not re-testing each component\'s own behavior)', async () => {
    fixture = await createSettledFixture();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('app-market-ticker')).toBeTruthy();
    expect(nativeElement.querySelector('app-market-state')).toBeTruthy();
    expect(nativeElement.querySelector('app-trending-carousel')).toBeTruthy();
    expect(nativeElement.querySelector('app-market-table')).toBeTruthy();
    expect(nativeElement.querySelector('app-currency-converter')).toBeTruthy();
  });

  it('renders no breadcrumb (deliberate exception for this page, see DESIGN.md)', async () => {
    fixture = await createSettledFixture();
    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
  });

  it('renders the featured coin\'s name and price directly in the hero', async () => {
    fixture = await createSettledFixture();
    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Bitcoin');
    expect(nativeElement.textContent).toContain('BTC');
  });

  // This app is zoneless (no zone.js dependency), so Angular's own
  // fakeAsync()/tick() can't be used (they're a zone.js testing
  // utility). Vitest's fake timers work independently of Angular's
  // zone, since setInterval is a plain global the component calls
  // directly — but they must be installed BEFORE the component (and
  // its setInterval registration in the constructor) is created, or
  // the real interval already running is invisible to them. Same
  // pattern already established in market-ticker.spec.ts.
  it('re-triggers both market and trending fetches after REFRESH_INTERVAL_MS elapses', async () => {
    vi.useFakeTimers();
    try {
      fixture = TestBed.createComponent(CryptoDashboard);
      fixture.detectChanges();
      expect(pageMarketFetchCount()).toBe(1);
      expect(getTrendingSpy).toHaveBeenCalledTimes(1);

      // The interval callback updates a signal (marketRetryTrigger/
      // trendingRetryTrigger); the effect() that reads it and actually
      // calls getMarkets()/getTrending() runs on Angular's own next
      // scheduling tick, not synchronously within the timer callback —
      // detectChanges() flushes that, same as any other signal-driven
      // update in this zoneless app (market-ticker's own equivalent
      // test skips this because it calls fetchCoins() directly from the
      // interval, with no signal/effect indirection in between).
      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
      fixture.detectChanges();
      expect(pageMarketFetchCount()).toBe(2);
      expect(getTrendingSpy).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
      fixture.detectChanges();
      expect(pageMarketFetchCount()).toBe(3);
      expect(getTrendingSpy).toHaveBeenCalledTimes(3);

      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the interval on destroy, no further polling afterwards', async () => {
    vi.useFakeTimers();
    try {
      fixture = TestBed.createComponent(CryptoDashboard);
      fixture.detectChanges();
      expect(pageMarketFetchCount()).toBe(1);
      expect(getTrendingSpy).toHaveBeenCalledTimes(1);

      fixture.destroy();
      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS * 3);

      expect(pageMarketFetchCount()).toBe(1);
      expect(getTrendingSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('creates exactly one fresh interval when the page is destroyed and re-entered, never stacking on a leaked previous one', async () => {
    vi.useFakeTimers();
    try {
      const first = TestBed.createComponent(CryptoDashboard);
      first.detectChanges();
      first.destroy();

      getMarketsSpy.mockClear();
      getTrendingSpy.mockClear();

      const second = TestBed.createComponent(CryptoDashboard);
      second.detectChanges();
      expect(pageMarketFetchCount()).toBe(1); // the second instance's own initial fetch
      expect(getTrendingSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
      second.detectChanges();
      // Exactly one more call each: only the second instance's own
      // interval fired. Two would mean the first instance's interval
      // leaked and is still running alongside the second's.
      expect(pageMarketFetchCount()).toBe(2);
      expect(getTrendingSpy).toHaveBeenCalledTimes(2);

      second.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('defaults to the "Trending" tab, feeding the carousel from getTrending()', async () => {
    getTrendingSpy.mockResolvedValue([buildCoin({ id: 'trending-coin', name: 'Trending Coin' })]);
    fixture = await createSettledFixture();

    expect(fixture.componentInstance.activeTrendingTab()).toBe('trending');
    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Trending Coin');
  });

  it('switches the carousel to "Top Movers" (sorted by |24h change|, from the already-fetched market coins) on tab click, no new API call', async () => {
    getMarketsSpy.mockResolvedValue([
      buildCoin({ id: 'small-mover', name: 'Small Mover', changePercentage24h: 1 }),
      buildCoin({ id: 'big-mover', name: 'Big Mover', changePercentage24h: -9 }),
      buildCoin({ id: 'mid-mover', name: 'Mid Mover', changePercentage24h: 4 }),
    ]);
    fixture = await createSettledFixture();
    getMarketsSpy.mockClear();

    const tabButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (btn) => btn.textContent?.trim() === 'Top Movers',
    ) as HTMLButtonElement;
    tabButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTrendingTab()).toBe('movers');
    expect(getMarketsSpy).not.toHaveBeenCalled(); // reused already-fetched market data, no new fetch

    const topMovers = fixture.componentInstance.topMovers();
    expect(topMovers.map((c) => c.id)).toEqual(['big-mover', 'mid-mover', 'small-mover']); // sorted by |change| desc

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Big Mover');
  });

  it('routes the carousel\'s retry to the market fetch while on the "Top Movers" tab, to trending while on "Trending"', async () => {
    fixture = await createSettledFixture();
    const component = fixture.componentInstance;

    component.setTrendingTab('movers');
    getMarketsSpy.mockClear();
    getTrendingSpy.mockClear();
    component.onTrendingCarouselRetry();
    fixture.detectChanges(); // flushes the effect() the retry trigger signal wakes, see auto-refresh tests above
    expect(getMarketsSpy).toHaveBeenCalled();
    expect(getTrendingSpy).not.toHaveBeenCalled();

    component.setTrendingTab('trending');
    getMarketsSpy.mockClear();
    getTrendingSpy.mockClear();
    component.onTrendingCarouselRetry();
    fixture.detectChanges();
    expect(getTrendingSpy).toHaveBeenCalled();
    expect(getMarketsSpy).not.toHaveBeenCalled();
  });

  it('marks the active tab with aria-pressed="true" and the inactive one "false"', async () => {
    fixture = await createSettledFixture();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(nativeElement.querySelectorAll('button'));
    const trendingTab = buttons.find((btn) => btn.textContent?.trim() === 'Trending') as HTMLButtonElement;
    const moversTab = buttons.find((btn) => btn.textContent?.trim() === 'Top Movers') as HTMLButtonElement;

    expect(trendingTab.getAttribute('aria-pressed')).toBe('true');
    expect(moversTab.getAttribute('aria-pressed')).toBe('false');

    moversTab.click();
    fixture.detectChanges();

    expect(trendingTab.getAttribute('aria-pressed')).toBe('false');
    expect(moversTab.getAttribute('aria-pressed')).toBe('true');
  });

  // buildPdfReportData() is a pure function (see crypto-dashboard.ts's
  // own doc comment on it): tested directly here, no TestBed, no
  // mocking of @zhunam/pdf-generator at all. Deliberately not mocking
  // that library's generatePdf() itself: it's resolved via a tsconfig
  // path alias, not a real npm package, and vi.mock() on that kind of
  // specifier proved unreliable in practice here (silently never
  // intercepted the import actually used inside crypto-dashboard.ts,
  // confirmed empirically before this test file settled on this
  // approach instead). Testing the pure data-assembly step directly
  // covers everything these tests actually care about (formatting,
  // the dominance transform) without depending on that.
  it('formats prices, signed percentages, and summary numbers', () => {
    const coins = [
      buildCoin({ id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', currentPrice: 65000, changePercentage24h: 1.5 }),
      buildCoin({ id: 'ethereum', name: 'Ethereum', symbol: 'eth', currentPrice: 2500.4, changePercentage24h: -2.5 }),
    ];

    const data = buildPdfReportData(sampleStats, coins, new Date(2026, 8, 13, 15, 30));

    expect(data.coins).toEqual([
      { name: 'Bitcoin', symbol: 'BTC', price: '$65,000.00', change: '+1.50%' },
      { name: 'Ethereum', symbol: 'ETH', price: '$2,500.40', change: '-2.50%' },
    ]);
    expect(data.summary.totalMarketCap).toBe('$2,654,490,015,954.50');
    expect(data.summary.totalVolume).toBe('$107,207,728,882.80');
    expect(data.summary.activeCryptocurrencies).toBe('21,084');
  });

  it('transforms dominanceByCoin into the expected {coin, share} table rows, symbol uppercased', () => {
    const data = buildPdfReportData(sampleStats, [buildCoin()], new Date(2026, 8, 13));

    expect(data.dominance).toEqual([
      { coin: 'BTC', share: '58.17%' },
      { coin: 'ETH', share: '11.65%' },
    ]);
  });

  it('formatDateForFilename() produces the YYYY-MM-DD format exportPdf() uses for the download filename', () => {
    expect(formatDateForFilename(new Date(2026, 8, 13))).toBe('2026-09-13');
    expect(formatDateForFilename(new Date(2026, 0, 5))).toBe('2026-01-05'); // single-digit month/day, zero-padded
  });

  it('clicking "Export PDF" triggers exportPdf()', async () => {
    fixture = await createSettledFixture();
    const exportSpy = vi.spyOn(fixture.componentInstance, 'exportPdf').mockResolvedValue(undefined);
    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Export PDF'),
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(exportSpy).toHaveBeenCalledTimes(1);
  });

  it('disables the Export PDF button until both market coins and global stats have loaded', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    getGlobalStatsSpy.mockReturnValue(new Promise(() => {}));
    fixture = TestBed.createComponent(CryptoDashboard);
    fixture.detectChanges();

    const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Export PDF'),
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('never adds a repeated getGlobalStats() call from the auto-refresh interval', async () => {
    // getGlobalStatsSpy is shared across every real caller on this page,
    // same aliasing as getMarketsSpy/pageMarketFetchCount() above:
    // market-state.ts already calls getGlobalStats() on its own (see
    // that component's own file, untouched by this task), and this
    // page's own new fetch is a second, independent real caller. Both
    // legitimately call it once each on init; CoinGeckoService's real
    // cache is what dedupes them into one real network request, not
    // something a call-count assertion on a mocked function can see.
    // What this test actually guards is that the auto-refresh interval
    // doesn't add a THIRD call on top of those two.
    vi.useFakeTimers();
    try {
      fixture = TestBed.createComponent(CryptoDashboard);
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(0); // lets both components' plain .then()/effect() calls resolve
      const callsAfterInit = getGlobalStatsSpy.mock.calls.length;
      expect(callsAfterInit).toBeGreaterThan(0);

      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS * 2);
      fixture.detectChanges();
      expect(getGlobalStatsSpy).toHaveBeenCalledTimes(callsAfterInit); // no growth from the interval

      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
