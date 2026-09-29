import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  buildPdfReportData,
  CryptoDashboard,
  formatDateForFilename,
  INACTIVITY_TIMEOUT_MS,
  MARKET_COINS_FETCH_SIZE,
  MARKET_TABLE_SIZE,
  REFRESH_INTERVAL_MS,
  TICKER_COIN_COUNT,
} from './crypto-dashboard';
import { CoinGeckoService } from './services/coingecko';
import { CurrencyConverter } from './components/currency-converter/currency-converter';
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

// jsdom's `document.hidden` is a getter; redefining it as an own property
// on the instance shadows that getter without touching the prototype, the
// standard way to simulate visibilitychange in a browser-less test.
function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

function dispatchActivity(): void {
  window.dispatchEvent(new Event('mousemove'));
}

// REFRESH_INTERVAL_MS (5min) is now longer than INACTIVITY_TIMEOUT_MS
// (2min): a test that silently advances a full REFRESH_INTERVAL_MS would
// cross the inactivity threshold first and get correctly paused before the
// scheduled tick ever arrives, which is the intended interaction, not a
// bug (see the "pause on visibility/inactivity" tests below). Tests that
// mean to exercise a normal, actively-used refresh cycle instead advance
// in steps shorter than INACTIVITY_TIMEOUT_MS, dispatching activity
// between them, the same way a real visitor moving their mouse
// periodically would keep the page from ever going idle.
async function advanceWithActivity(
  fixture: ComponentFixture<CryptoDashboard>,
  totalMs: number,
): Promise<void> {
  // Resets the inactivity clock relative to right now, regardless of how
  // long it's been since some earlier call in the same test last touched
  // it: without this, two separate advanceWithActivity() calls back to
  // back could leave a gap between the first call's last internal
  // dispatch and the second call's first one wide enough to still cross
  // INACTIVITY_TIMEOUT_MS.
  dispatchActivity();
  const stepMs = INACTIVITY_TIMEOUT_MS - 1000;
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    await vi.advanceTimersByTimeAsync(step);
    fixture.detectChanges();
    remaining -= step;
    if (remaining > 0) {
      dispatchActivity();
    }
  }
}

describe('CryptoDashboard', () => {
  let fixture: ComponentFixture<CryptoDashboard>;
  let getMarketsSpy: ReturnType<typeof vi.fn>;
  let getTrendingSpy: ReturnType<typeof vi.fn>;
  let getGlobalStatsSpy: ReturnType<typeof vi.fn>;

  // This page assembles several components that each inject
  // CoinGeckoService independently. market-ticker and currency-converter
  // no longer do (see the fetch-unification block below); market-state
  // (out of scope for that change) still calls getMarkets('usd', 100) on
  // its own, which now happens to share the exact same params as the
  // page's own unified fetch — see totalSharedFetchCalls() below for how
  // the tests in this file isolate the page's own calls from that.
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

  afterEach(() => {
    // Restore jsdom's default so a hidden override from one test never
    // leaks into another spec file sharing the same jsdom document.
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  async function createSettledFixture(): Promise<ComponentFixture<CryptoDashboard>> {
    const f = TestBed.createComponent(CryptoDashboard);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return f;
  }

  // getMarketsSpy is shared by every real caller of getMarkets('usd', 100)
  // on this page: the page's own unified fetch AND market-state's own
  // (unchanged, out of scope) call. Both now use the exact same params,
  // so a raw call count mixes them. Every test below either reads this
  // total as a fixed baseline (2, right after initial load: one from
  // each) plus deltas from actions that only the page's own effect
  // reacts to (manual retry, the interval tick, resume), since
  // market-state never re-fires after its own initial load.
  function totalSharedFetchCalls(): number {
    return getMarketsSpy.mock.calls.filter(
      ([vsCurrency, count]) => vsCurrency === 'usd' && count === MARKET_COINS_FETCH_SIZE,
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

  describe('unified getMarkets(\'usd\', 100) fetch', () => {
    it('fetches only once per manual retry from the page itself, not three separate calls (20/11/100) across market-table/market-ticker/currency-converter', async () => {
      fixture = await createSettledFixture();
      getMarketsSpy.mockClear();

      fixture.componentInstance.onMarketRetry();
      fixture.detectChanges();
      await fixture.whenStable();

      const newCalls = getMarketsSpy.mock.calls.filter(
        ([vsCurrency, count]) => vsCurrency === 'usd' && count === MARKET_COINS_FETCH_SIZE,
      );
      expect(newCalls.length).toBe(1);
    });

    it('never calls getMarkets with the old per-child counts (20 or 11) anymore', async () => {
      fixture = await createSettledFixture();

      const oldCountCalls = getMarketsSpy.mock.calls.filter(
        ([vsCurrency, count]) => vsCurrency === 'usd' && (count === MARKET_TABLE_SIZE || count === TICKER_COIN_COUNT),
      );
      expect(oldCountCalls.length).toBe(0);
    });

    it('derives marketTableCoins (top 20) and tickerCoins (top 11) as plain slices of the one shared 100-coin array, in the same order', async () => {
      const coins = Array.from({ length: MARKET_COINS_FETCH_SIZE }, (_, i) =>
        buildCoin({ id: `coin-${i}`, symbol: `c${i}`, name: `Coin ${i}` }),
      );
      getMarketsSpy.mockResolvedValue(coins);
      fixture = await createSettledFixture();
      const component = fixture.componentInstance;

      expect(component.marketCoins().length).toBe(MARKET_COINS_FETCH_SIZE);
      expect(component.marketTableCoins()).toEqual(coins.slice(0, MARKET_TABLE_SIZE));
      expect(component.tickerCoins()).toEqual(coins.slice(0, TICKER_COIN_COUNT));
    });

    it('feeds currency-converter the full 100-coin array, not a slice', async () => {
      const coins = Array.from({ length: MARKET_COINS_FETCH_SIZE }, (_, i) =>
        buildCoin({ id: `coin-${i}`, symbol: `c${i}`, name: `Coin ${i}` }),
      );
      getMarketsSpy.mockResolvedValue(coins);
      fixture = await createSettledFixture();

      const converterDebugEl = fixture.debugElement.query(By.directive(CurrencyConverter));
      expect((converterDebugEl.componentInstance as CurrencyConverter).coins().length).toBe(
        MARKET_COINS_FETCH_SIZE,
      );
    });
  });

  // This app is zoneless (no zone.js dependency), so Angular's own
  // fakeAsync()/tick() can't be used (they're a zone.js testing
  // utility). Vitest's fake timers work independently of Angular's
  // zone, since setInterval is a plain global the component calls
  // directly — but they must be installed BEFORE the component (and
  // its setInterval registration in the constructor) is created, or
  // the real interval already running is invisible to them. Same
  // pattern already established in market-ticker.spec.ts.
  it('re-triggers both market and trending fetches after REFRESH_INTERVAL_MS elapses (now 5 minutes, a single declaration)', async () => {
    vi.useFakeTimers();
    try {
      fixture = TestBed.createComponent(CryptoDashboard);
      fixture.detectChanges();
      const baseline = totalSharedFetchCalls(); // this page's own initial fetch + market-state's own, unrelated one
      expect(baseline).toBe(2);
      expect(getTrendingSpy).toHaveBeenCalledTimes(1);

      // The interval callback updates a signal (marketRetryTrigger/
      // trendingRetryTrigger); the effect() that reads it and actually
      // calls getMarkets()/getTrending() runs on Angular's own next
      // scheduling tick, not synchronously within the timer callback —
      // detectChanges() flushes that, same as any other signal-driven
      // update in this zoneless app.
      await advanceWithActivity(fixture, REFRESH_INTERVAL_MS);
      // +1, not +2: only the page's own interval tick fires again;
      // market-state has no timer of its own and never re-triggers.
      expect(totalSharedFetchCalls()).toBe(baseline + 1);
      expect(getTrendingSpy).toHaveBeenCalledTimes(2);

      await advanceWithActivity(fixture, REFRESH_INTERVAL_MS);
      expect(totalSharedFetchCalls()).toBe(baseline + 2);
      expect(getTrendingSpy).toHaveBeenCalledTimes(3);

      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does NOT tick at the old 50s interval anymore', async () => {
    vi.useFakeTimers();
    try {
      fixture = TestBed.createComponent(CryptoDashboard);
      fixture.detectChanges();
      const baseline = totalSharedFetchCalls();

      await vi.advanceTimersByTimeAsync(50_000);
      fixture.detectChanges();
      expect(totalSharedFetchCalls()).toBe(baseline); // no growth yet, REFRESH_INTERVAL_MS is 300_000 now
      expect(getTrendingSpy).toHaveBeenCalledTimes(1);

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
      const baseline = totalSharedFetchCalls();
      expect(getTrendingSpy).toHaveBeenCalledTimes(1);

      fixture.destroy();
      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS * 3);

      expect(totalSharedFetchCalls()).toBe(baseline);
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
      const baseline = totalSharedFetchCalls(); // the second instance's own initial fetch + market-state's
      expect(baseline).toBe(2);
      expect(getTrendingSpy).toHaveBeenCalledTimes(1);

      await advanceWithActivity(second, REFRESH_INTERVAL_MS);
      // Exactly one more: only the second instance's own interval fired.
      // Two would mean the first instance's interval leaked and is still
      // running alongside the second's.
      expect(totalSharedFetchCalls()).toBe(baseline + 1);
      expect(getTrendingSpy).toHaveBeenCalledTimes(2);

      second.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  describe('pause on visibility/inactivity', () => {
    it('pauses immediately when the tab is hidden, with no fetch on the next scheduled tick', async () => {
      vi.useFakeTimers();
      try {
        fixture = TestBed.createComponent(CryptoDashboard);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();

        setHidden(true);
        fixture.detectChanges();
        expect(fixture.componentInstance.isPaused()).toBe(true);

        const before = totalSharedFetchCalls();
        await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
        fixture.detectChanges();
        expect(totalSharedFetchCalls()).toBe(before); // the tick was skipped

        fixture.destroy();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not force a refetch on becoming visible again after only a brief hidden period', async () => {
      vi.useFakeTimers();
      try {
        fixture = TestBed.createComponent(CryptoDashboard);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();

        setHidden(true);
        await vi.advanceTimersByTimeAsync(2_000); // well under the 45s cache TTL and the 2min inactivity timeout
        const before = totalSharedFetchCalls();
        setHidden(false);
        fixture.detectChanges();

        expect(totalSharedFetchCalls()).toBe(before);
        expect(fixture.componentInstance.isPaused()).toBe(false);

        fixture.destroy();
      } finally {
        vi.useRealTimers();
      }
    });

    it('refetches immediately on becoming visible again once the hidden period exceeds the 45s cache TTL', async () => {
      vi.useFakeTimers();
      try {
        fixture = TestBed.createComponent(CryptoDashboard);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();

        setHidden(true);
        await vi.advanceTimersByTimeAsync(50_000); // past the 45s TTL, still under REFRESH_INTERVAL_MS
        const before = totalSharedFetchCalls();
        setHidden(false);
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();

        expect(totalSharedFetchCalls()).toBe(before + 1);
        expect(fixture.componentInstance.isPaused()).toBe(false);

        fixture.destroy();
      } finally {
        vi.useRealTimers();
      }
    });

    it('pauses after exactly INACTIVITY_TIMEOUT_MS with no mousemove/keydown/touchstart/scroll while visible', async () => {
      vi.useFakeTimers();
      try {
        fixture = TestBed.createComponent(CryptoDashboard);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();
        expect(fixture.componentInstance.isPaused()).toBe(false);

        await vi.advanceTimersByTimeAsync(INACTIVITY_TIMEOUT_MS);
        fixture.detectChanges();
        expect(fixture.componentInstance.isPaused()).toBe(true);

        fixture.destroy();
      } finally {
        vi.useRealTimers();
      }
    });

    it('resumes and refetches immediately on activity after an inactivity pause, and restarts its own timer', async () => {
      vi.useFakeTimers();
      try {
        fixture = TestBed.createComponent(CryptoDashboard);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();

        await vi.advanceTimersByTimeAsync(INACTIVITY_TIMEOUT_MS);
        fixture.detectChanges();
        expect(fixture.componentInstance.isPaused()).toBe(true);

        const before = totalSharedFetchCalls();
        dispatchActivity();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();

        expect(fixture.componentInstance.isPaused()).toBe(false);
        expect(totalSharedFetchCalls()).toBe(before + 1);

        // The inactivity timer restarted from this activity: not already
        // expired, needs a full new INACTIVITY_TIMEOUT_MS of silence.
        await vi.advanceTimersByTimeAsync(INACTIVITY_TIMEOUT_MS - 1);
        fixture.detectChanges();
        expect(fixture.componentInstance.isPaused()).toBe(false);

        fixture.destroy();
      } finally {
        vi.useRealTimers();
      }
    });

    it('stays paused for the hidden reason while hidden; activity events while hidden have no effect (inactivity is only evaluated while visible)', async () => {
      vi.useFakeTimers();
      try {
        fixture = TestBed.createComponent(CryptoDashboard);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();

        setHidden(true);
        fixture.detectChanges();
        expect(fixture.componentInstance.isPaused()).toBe(true);

        const before = totalSharedFetchCalls();
        dispatchActivity();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();
        expect(totalSharedFetchCalls()).toBe(before);
        expect(fixture.componentInstance.isPaused()).toBe(true);

        await vi.advanceTimersByTimeAsync(INACTIVITY_TIMEOUT_MS);
        fixture.detectChanges();
        expect(fixture.componentInstance.isPaused()).toBe(true); // still hidden, same reason

        fixture.destroy();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('market-table pause banner', () => {
    it('does not show the pause banner during initial loading', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      getMarketsSpy.mockReturnValue(new Promise(() => {}));
      fixture = TestBed.createComponent(CryptoDashboard);
      fixture.detectChanges();

      const nativeElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.textContent).toContain('Loading...');
      expect(nativeElement.textContent).not.toContain('Live updates paused');
    });

    it('shows the banner once paused after a successful load, and clicking Resume resumes polling and refetches immediately', async () => {
      vi.useFakeTimers();
      try {
        fixture = TestBed.createComponent(CryptoDashboard);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();

        await vi.advanceTimersByTimeAsync(INACTIVITY_TIMEOUT_MS);
        fixture.detectChanges();
        expect(fixture.componentInstance.isPaused()).toBe(true);

        const nativeElement = fixture.nativeElement as HTMLElement;
        expect(nativeElement.textContent).toContain('Live updates paused. Data may be out of date.');
        // The table stays in the DOM underneath the banner, only dimmed.
        expect(nativeElement.querySelector('app-market-table table')).toBeTruthy();

        const resumeButton = Array.from(nativeElement.querySelectorAll('button')).find(
          (btn) => btn.textContent?.trim() === 'Resume',
        ) as HTMLButtonElement;
        expect(resumeButton).toBeTruthy();

        const before = totalSharedFetchCalls();
        resumeButton.click();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();

        expect(fixture.componentInstance.isPaused()).toBe(false);
        expect(totalSharedFetchCalls()).toBe(before + 1);
        expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Live updates paused');

        fixture.destroy();
      } finally {
        vi.useRealTimers();
      }
    });
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
    // same aliasing as getMarketsSpy/totalSharedFetchCalls() above:
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
