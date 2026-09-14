import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { generatePdf, pdfColumn, pdfHeading, pdfRow, pdfSpacer, pdfTable, pdfText, type PdfTemplate } from '@zhunam/pdf-generator';
import { CoinGeckoService } from './services/coingecko';
import { CryptoCoin, GlobalMarketStats, TrendingCoin } from './models/coin';
import { priceDirection } from './utils/price-direction';
import { MarketTicker } from './components/market-ticker/market-ticker';
import { MarketTable } from './components/market-table/market-table';
import { TrendingCarousel } from './components/trending-carousel/trending-carousel';
import { CurrencyConverter } from './components/currency-converter/currency-converter';
import { MarketState } from './components/market-state/market-state';

// A reasonable dashboard table size, distinct from market-ticker's own
// TICKER_COIN_COUNT (that one is sized to fill a marquee, this is sized
// to be a readable table).
export const MARKET_TABLE_SIZE = 20;

// Same value and reasoning as market-ticker's own REFRESH_INTERVAL_MS
// (duplicated, not imported/shared, matching this codebase's existing
// per-file constant convention): slightly above CoinGeckoService's 45s
// cache TTL, so a poll never lands a moment before expiry and hits the
// still-cached value for a round trip that returns no new data.
// market-table and trending-carousel deliberately don't get their own
// timer: both are pure input()-driven components fed by this page, so
// centralizing the one interval here (re-triggering the same
// marketRetryTrigger/trendingRetryTrigger the Retry buttons already
// use) covers both without duplicating a timer + DestroyRef cleanup
// pattern three times over.
export const REFRESH_INTERVAL_MS = 50_000;

// Mirrors trending-carousel's own sparkline constants: duplicated here
// (not imported/shared) since this task's scope doesn't allow touching
// that component's file, see DESIGN.md "Crypto Dashboard (page-specific
// register)".
const HERO_SPARKLINE_WIDTH = 100;
const HERO_SPARKLINE_HEIGHT = 32;

// "Top Movers" reuses the same top-20 market-cap coins already fetched
// for market-table (see MARKET_TABLE_SIZE above), sorted client-side by
// |24h change| instead of a second API call — see DESIGN.md "Tabs".
// Capped to roughly the same count getTrending() itself returns, so
// switching tabs doesn't noticeably change how many cards the carousel
// holds.
const TOP_MOVERS_COUNT = 10;

export type TrendingTab = 'trending' | 'movers';

// Same exact wording already used in the page footer (app.html), see
// DESIGN.md/ROADMAP.md: CoinGecko's real API terms (section 4.4)
// require this text, no smaller than 10pt; pdfText's default fontSize
// there is 8pt so it's set explicitly (see PDF_FOOTER_TEXT_OPTS below).
const COINGECKO_ATTRIBUTION_TEXT =
  'Powered by CoinGecko API. Informational only, not financial advice: verify any price before making decisions.';

const CURRENCY_FORMAT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const NUMBER_FORMAT = new Intl.NumberFormat('en-US');
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'medium' });

function formatCurrency(value: number): string {
  return CURRENCY_FORMAT.format(value);
}

function formatCount(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function formatSignedPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface PdfDominanceRow {
  coin: string;
  share: string;
}

export interface PdfMarketRow {
  name: string;
  symbol: string;
  price: string;
  change: string;
}

export interface PdfReportData {
  generatedAt: string;
  summary: { totalMarketCap: string; totalVolume: string; activeCryptocurrencies: string };
  dominance: PdfDominanceRow[];
  coins: PdfMarketRow[];
}

/**
 * Pure data-assembly step for the PDF export, kept separate from
 * exportPdf() below and from any call to generatePdf() itself so it's
 * directly unit-testable (formatting/transform logic) without needing
 * to mock the pdf-generator library at all. Every dynamic value here
 * is already a plain formatted string, resolved later by the template
 * via {{path}} placeholders, never concatenated into a template string
 * directly — see PDF_REPORT_TEMPLATE's own doc comment.
 */
export function buildPdfReportData(
  stats: GlobalMarketStats,
  coins: CryptoCoin[],
  generatedAt: Date,
): PdfReportData {
  return {
    generatedAt: DATE_TIME_FORMAT.format(generatedAt),
    summary: {
      totalMarketCap: formatCurrency(stats.totalMarketCapByCurrency['usd'] ?? 0),
      totalVolume: formatCurrency(stats.totalVolumeByCurrency['usd'] ?? 0),
      activeCryptocurrencies: formatCount(stats.activeCryptocurrencies),
    },
    dominance: Object.entries(stats.dominanceByCoin).map(([coin, share]) => ({
      coin: coin.toUpperCase(),
      share: formatPercent(share),
    })),
    coins: coins.map((coin) => ({
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      price: formatCurrency(coin.currentPrice),
      change: formatSignedPercent(coin.changePercentage24h),
    })),
  };
}

/**
 * The report's shape: every dynamic value (dates, formatted numbers,
 * coin names) flows through `data` and is resolved via `{{path}}`
 * placeholders, never concatenated directly into a template string —
 * the same safe-by-construction path this library's own docs describe
 * (a plain dot-path resolver, no expression evaluation). Only the
 * static English labels below are literal strings in the template.
 */
// Real pdfmake behavior (confirmed against @types/pdfmake's own
// interfaces.d.ts, not assumed): PdfTemplate.margins maps to
// pdfmake's pageMargins, which is documented as "Margins around the
// content on each page" — the BODY only. header/footer are a
// completely separate Content tree, rendered flush to the page's
// physical edges by default; pageMargins.top/bottom only has to be
// tall enough to fit them ("must leave sufficient room for it to be
// rendered at all"), it doesn't give them their own inset. Confirmed
// this app's own header still touched the left/top page edge even
// after the previous margins fix, exactly as that real behavior
// predicts.
//
// @zhunam/pdf-generator's public API has no `margin` field on any
// PdfBlock/PdfLayoutOptions/PdfTextOptions (checked pdf-block.ts
// before concluding this, not assumed): real pdfmake Content supports
// a generic margin/marginTop/... property, but this library doesn't
// expose it anywhere. That's a real gap in the library worth an
// additive extension later (e.g. a margin option on PdfLayoutOptions),
// proposed separately, not implemented here without confirmation.
// Resolved instead entirely from this app, using only the library's
// existing public factories: an empty, fixed-width pdfColumn() in a
// pdfRow() acts as a left/right inset (the same "empty block for
// spacing" approach the task itself suggested), and a leading
// pdfSpacer() inside the header's own column acts as a top inset —
// matching the body's own configured 40pt left/right margin.
const HEADER_FOOTER_SIDE_MARGIN = 40;

// A4 = 595.28pt wide (pdfmake's own real standardPageSizes.js, not
// assumed). The footer's centered text needs an explicit width on its
// own middle column: PdfLayoutOptions.width only accepts a plain
// number in this library's public API (no '*'/'auto' passthrough), so
// there's no way to ask for "the remaining space" symbolically — this
// computes that remaining space directly instead, guaranteeing the
// centered text is centered within the same width as the body's own
// content (595.28 minus the same 40pt inset on each side), regardless
// of whatever pdfmake's own default happens to be for an unset column
// width.
const A4_WIDTH_PT = 595.28;
const HEADER_FOOTER_CONTENT_WIDTH = A4_WIDTH_PT - HEADER_FOOTER_SIDE_MARGIN * 2;

const PDF_REPORT_TEMPLATE: PdfTemplate = {
  margins: { top: 90, bottom: 60, left: HEADER_FOOTER_SIDE_MARGIN, right: HEADER_FOOTER_SIDE_MARGIN },
  header: pdfRow([
    pdfColumn([], { width: HEADER_FOOTER_SIDE_MARGIN }),
    pdfColumn([
      pdfSpacer(30),
      pdfHeading('Crypto Market Report'),
      pdfText('Generated {{generatedAt}}', { fontSize: 10, color: '#475569' }),
    ]),
  ]),
  // Same exact text as the page footer; see COINGECKO_ATTRIBUTION_TEXT.
  // Left/right spacer columns on both sides (not just left, unlike the
  // header) so the centered text stays centered within the same inset
  // margin box as the body, rather than shifting right.
  footer: pdfRow([
    pdfColumn([], { width: HEADER_FOOTER_SIDE_MARGIN }),
    pdfColumn([pdfText(COINGECKO_ATTRIBUTION_TEXT, { fontSize: 8, color: '#475569', alignment: 'center' })], {
      width: HEADER_FOOTER_CONTENT_WIDTH,
    }),
    pdfColumn([], { width: HEADER_FOOTER_SIDE_MARGIN }),
  ]),
  body: [
    pdfHeading('Global Market Summary', 2),
    pdfText('Total Market Cap (USD): {{summary.totalMarketCap}}'),
    pdfText('Total Volume (USD): {{summary.totalVolume}}'),
    pdfText('Active Cryptocurrencies: {{summary.activeCryptocurrencies}}'),
    pdfSpacer(12),
    pdfHeading('Market Cap Dominance', 2),
    pdfTable('dominance', {
      columns: [
        { header: 'Coin', path: 'coin', width: 200 },
        { header: 'Market Cap Share', path: 'share', width: 150 },
      ],
    }),
    pdfSpacer(12),
    pdfHeading('Market', 2),
    // No color on "24h Change": pdfTable has no per-cell conditional
    // styling hook in this library's v1 API (confirmed against its
    // README/models before implementing, not an oversight), unlike the
    // live page's green/red priceDirection() convention. The +/- sign
    // is the only direction cue this table can carry.
    pdfTable('coins', {
      columns: [
        { header: 'Name', path: 'name', width: 160 },
        { header: 'Symbol', path: 'symbol', width: 70 },
        { header: 'Price', path: 'price', width: 110 },
        { header: '24h Change', path: 'change', width: 90 },
      ],
    }),
  ],
};

@Component({
  selector: 'app-crypto-dashboard',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    MarketTicker,
    MarketTable,
    TrendingCarousel,
    CurrencyConverter,
    MarketState,
  ],
  templateUrl: './crypto-dashboard.html',
  styleUrl: './crypto-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CryptoDashboard {
  // Exposed for the template's viewBox binding (the ambient sparkline
  // background's mask/gradient rects need the same numeric bounds).
  readonly heroSparklineWidth = HERO_SPARKLINE_WIDTH;
  readonly heroSparklineHeight = HERO_SPARKLINE_HEIGHT;

  private readonly coinGecko = inject(CoinGeckoService);

  private readonly marketCoinsSignal = signal<CryptoCoin[]>([]);
  private readonly marketErrorSignal = signal<string | null>(null);
  private readonly marketRetryTrigger = signal(0);
  readonly marketCoins = this.marketCoinsSignal.asReadonly();
  readonly marketError = this.marketErrorSignal.asReadonly();

  // The hero's featured coin reuses market-table's own top entry (BTC,
  // since /coins/markets is requested market-cap-desc) instead of a
  // redundant second fetch for the same shape of data.
  readonly featuredCoin = computed(() => this.marketCoins()[0]);

  // Page-level presentation only (reuses the existing helper, doesn't
  // duplicate its logic): colors the hero's 24h change the same way
  // price-ticker/market-table already do. The neutral case is swapped
  // for text-slate-300 instead of text-slate-600: this hero sits on the
  // dark Ink surface, and slate-600 (tuned for white panels) fails
  // contrast there, see DESIGN.md.
  readonly heroChangeColor = computed<'text-green-600' | 'text-red-600' | 'text-slate-300'>(() => {
    const coin = this.featuredCoin();
    if (!coin) return 'text-slate-300';
    switch (priceDirection(coin.changePercentage24h)) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-300';
    }
  });

  readonly heroLinePath = computed(() => {
    const points = this.heroSparklinePoints();
    if (points.length === 0) {
      return '';
    }
    return `M${points[0].x},${points[0].y} L${points
      .slice(1)
      .map((p) => `${p.x},${p.y}`)
      .join(' L')}`;
  });

  readonly heroAreaPath = computed(() => {
    const line = this.heroLinePath();
    if (!line) {
      return '';
    }
    return `${line} L${HERO_SPARKLINE_WIDTH},${HERO_SPARKLINE_HEIGHT} L0,${HERO_SPARKLINE_HEIGHT} Z`;
  });

  private readonly heroSparklinePoints = computed<{ x: number; y: number }[]>(() => {
    const values = this.featuredCoin()?.sparkline ?? [];
    if (values.length < 2) {
      return [];
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values.map((value, index) => ({
      x: (index / (values.length - 1)) * HERO_SPARKLINE_WIDTH,
      y: HERO_SPARKLINE_HEIGHT - ((value - min) / range) * HERO_SPARKLINE_HEIGHT,
    }));
  });

  private readonly trendingCoinsSignal = signal<TrendingCoin[]>([]);
  private readonly trendingErrorSignal = signal<string | null>(null);
  private readonly trendingRetryTrigger = signal(0);
  readonly trendingCoins = this.trendingCoinsSignal.asReadonly();
  readonly trendingError = this.trendingErrorSignal.asReadonly();

  // Which dataset the Trending section's carousel currently shows; see
  // DESIGN.md "Tabs". trending-carousel itself is untouched, only its
  // coins/error inputs (and which retry handler fires) swap here.
  private readonly activeTrendingTabSignal = signal<TrendingTab>('trending');
  readonly activeTrendingTab = this.activeTrendingTabSignal.asReadonly();

  readonly topMovers = computed(() =>
    [...this.marketCoins()]
      .sort((a, b) => Math.abs(b.changePercentage24h) - Math.abs(a.changePercentage24h))
      .slice(0, TOP_MOVERS_COUNT),
  );

  readonly trendingCarouselCoins = computed(() =>
    this.activeTrendingTab() === 'trending' ? this.trendingCoins() : this.topMovers(),
  );

  readonly trendingCarouselError = computed(() =>
    this.activeTrendingTab() === 'trending' ? this.trendingError() : this.marketError(),
  );

  // Same call (no params) market-state.ts already makes for the exact
  // same endpoint: CoinGeckoService's 45s cache serves whichever of the
  // two asks second, no second real fetch — same reasoning already
  // documented on market-state's own getSupportedCurrencies() call.
  // Only consumed by exportPdf() below, never rendered on the page
  // itself (market-state already renders its own live copy), so it's
  // fetched once on load rather than folded into the auto-refresh
  // interval above.
  private readonly globalStatsSignal = signal<GlobalMarketStats | null>(null);
  readonly globalStats = this.globalStatsSignal.asReadonly();

  private readonly pdfExportingSignal = signal(false);
  readonly pdfExporting = this.pdfExportingSignal.asReadonly();

  readonly canExportPdf = computed(
    () => this.globalStats() !== null && this.marketCoins().length > 0 && !this.pdfExporting(),
  );

  constructor() {
    effect(() => {
      this.marketRetryTrigger();
      this.coinGecko.getMarkets('usd', MARKET_TABLE_SIZE).then(
        (coins) => {
          this.marketCoinsSignal.set(coins);
          this.marketErrorSignal.set(null);
        },
        () => this.marketErrorSignal.set('Could not load market data.'),
      );
    });

    effect(() => {
      this.trendingRetryTrigger();
      this.coinGecko.getTrending().then(
        (coins) => {
          this.trendingCoinsSignal.set(coins);
          this.trendingErrorSignal.set(null);
        },
        () => this.trendingErrorSignal.set('Could not load trending coins.'),
      );
    });

    // For exportPdf() below; a failure here is deliberately swallowed
    // (not surfaced anywhere): the Export PDF button is already
    // disabled while globalStats() is null (see canExportPdf), which
    // is the only thing that depends on this succeeding.
    this.coinGecko.getGlobalStats().then(
      (stats) => this.globalStatsSignal.set(stats),
      () => undefined,
    );

    // Centralized auto-refresh for every input()-driven child fed from
    // this page (market-table, trending-carousel, and the hero, all
    // downstream of the two signals above): re-triggers the same
    // effects the Retry buttons already use, instead of a per-component
    // timer. One interval per page instance; DestroyRef guarantees it's
    // cleared when this component is destroyed (navigating away), so
    // re-entering the route later creates a fresh interval, never a
    // second one stacked on top of a leaked previous one.
    const intervalId = setInterval(() => {
      this.marketRetryTrigger.update((n) => n + 1);
      this.trendingRetryTrigger.update((n) => n + 1);
    }, REFRESH_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }

  onMarketRetry(): void {
    this.marketRetryTrigger.update((n) => n + 1);
  }

  onTrendingRetry(): void {
    this.trendingRetryTrigger.update((n) => n + 1);
  }

  setTrendingTab(tab: TrendingTab): void {
    this.activeTrendingTabSignal.set(tab);
  }

  onTrendingCarouselRetry(): void {
    if (this.activeTrendingTab() === 'trending') {
      this.onTrendingRetry();
    } else {
      this.onMarketRetry();
    }
  }

  async exportPdf(): Promise<void> {
    const stats = this.globalStats();
    const coins = this.marketCoins();
    if (!stats || coins.length === 0) {
      return; // guarded by canExportPdf() on the button too; a defensive no-op if called anyway
    }

    this.pdfExportingSignal.set(true);
    try {
      const generatedAt = new Date();
      const data = buildPdfReportData(stats, coins, generatedAt);
      const result = await generatePdf(PDF_REPORT_TEMPLATE, data);
      result.download(`crypto-market-report-${formatDateForFilename(generatedAt)}.pdf`);
    } finally {
      this.pdfExportingSignal.set(false);
    }
  }
}
