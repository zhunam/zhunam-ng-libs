import { ComponentFixture, TestBed } from '@angular/core/testing';
import { approxDayLabel, indexForPointerX, TrendingCarousel } from './trending-carousel';
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
    sparkline: [100, 102, 101, 105, 103, 108],
    ...overrides,
  };
}

// A real 168-point (7-day, hourly) sparkline for the hover/tooltip
// tests below, distinct values per index so a wrong-index bug would
// show up as a wrong price, not accidentally pass.
function buildFullSparkline(): number[] {
  return Array.from({ length: 168 }, (_, i) => 60000 + i * 10);
}

// jsdom doesn't lay out real geometry, and neither getBoundingClientRect
// (real dimensions) nor setPointerCapture (unimplemented on jsdom's
// SVGElement) work out of the box — both are stubbed directly on the
// element instance, same approach as this file's own existing
// mockScrollMetrics() for scroll geometry.
function mockChartRect(svg: SVGSVGElement, rect: { left: number; width: number }): void {
  svg.getBoundingClientRect = () =>
    ({
      left: rect.left,
      width: rect.width,
      top: 0,
      height: 144,
      right: rect.left + rect.width,
      bottom: 144,
      x: rect.left,
      y: 0,
      toJSON: () => undefined,
    }) as DOMRect;
  (svg as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = () => undefined;
}

// Avoids depending on jsdom's own PointerEvent constructor support: a
// plain Event with clientX/pointerId attached reads identically to a
// real PointerEvent for everything this component's handlers touch.
function firePointerEvent(el: Element, type: string, clientX: number): void {
  const event = new Event(type) as unknown as PointerEvent;
  Object.defineProperty(event, 'clientX', { value: clientX });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  el.dispatchEvent(event);
}

function mockScrollMetrics(
  el: HTMLElement,
  metrics: { scrollLeft: number; scrollWidth: number; clientWidth: number },
): void {
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: metrics.scrollWidth });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: metrics.clientWidth });
  el.scrollLeft = metrics.scrollLeft;
}

describe('TrendingCarousel', () => {
  let component: TrendingCarousel;
  let fixture: ComponentFixture<TrendingCarousel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrendingCarousel],
    }).compileComponents();

    fixture = TestBed.createComponent(TrendingCarousel);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('coins', [buildCoin()]);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders one card per coin', () => {
    fixture.componentRef.setInput('coins', [
      buildCoin({ id: 'bitcoin' }),
      buildCoin({ id: 'ethereum' }),
      buildCoin({ id: 'solana' }),
    ]);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('article');
    expect(cards.length).toBe(3);
  });

  it('colors a positive-change card green', () => {
    fixture.componentRef.setInput('coins', [buildCoin({ changePercentage24h: 4.21 })]);
    fixture.detectChanges();

    const changeEl = (fixture.nativeElement as HTMLElement).querySelector('article span.text-green-600');
    expect(changeEl).toBeTruthy();
  });

  it('colors a negative-change card red', () => {
    fixture.componentRef.setInput('coins', [buildCoin({ changePercentage24h: -2.5 })]);
    fixture.detectChanges();

    const changeEl = (fixture.nativeElement as HTMLElement).querySelector('article span.text-red-600');
    expect(changeEl).toBeTruthy();
  });

  it('shows a loading coin-spinner instead of the carousel while coins() is empty', () => {
    fixture.componentRef.setInput('coins', []);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('article')).toBeNull();
    expect(nativeElement.textContent).toContain('Loading...');
  });

  it('shows an error coin-spinner with the given message instead of the carousel when error() is set', () => {
    fixture.componentRef.setInput('coins', [buildCoin()]);
    fixture.componentRef.setInput('error', 'Rate limit exceeded, try again shortly.');
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('article')).toBeNull();
    expect(nativeElement.textContent).toContain('Rate limit exceeded, try again shortly.');
  });

  it('emits retry() when the error state\'s retry control is clicked', () => {
    fixture.componentRef.setInput('coins', [buildCoin()]);
    fixture.componentRef.setInput('error', 'Network error.');
    fixture.detectChanges();

    let retryCount = 0;
    component.retry.subscribe(() => retryCount++);

    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    button.click();

    expect(retryCount).toBe(1);
  });

  it('disables the previous arrow at the left scroll extreme, enables next', () => {
    fixture.componentRef.setInput('coins', [buildCoin(), buildCoin({ id: 'ethereum' })]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const scrollEl = nativeElement.querySelector('.overflow-x-auto') as HTMLElement;
    mockScrollMetrics(scrollEl, { scrollLeft: 0, scrollWidth: 1000, clientWidth: 300 });
    scrollEl.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    const prevButton = nativeElement.querySelector('button[aria-label="Previous"]') as HTMLButtonElement;
    const nextButton = nativeElement.querySelector('button[aria-label="Next"]') as HTMLButtonElement;
    expect(prevButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(false);
  });

  it('disables the next arrow at the right scroll extreme, enables previous', () => {
    fixture.componentRef.setInput('coins', [buildCoin(), buildCoin({ id: 'ethereum' })]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const scrollEl = nativeElement.querySelector('.overflow-x-auto') as HTMLElement;
    mockScrollMetrics(scrollEl, { scrollLeft: 700, scrollWidth: 1000, clientWidth: 300 });
    scrollEl.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    const prevButton = nativeElement.querySelector('button[aria-label="Previous"]') as HTMLButtonElement;
    const nextButton = nativeElement.querySelector('button[aria-label="Next"]') as HTMLButtonElement;
    expect(prevButton.disabled).toBe(false);
    expect(nextButton.disabled).toBe(true);
  });

  it('never renders a buy/sell/trade control', () => {
    fixture.componentRef.setInput('coins', [buildCoin()]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toMatch(/buy|sell|trade/i);
  });

  it('renders the coin image via [src], never via innerHTML', () => {
    fixture.componentRef.setInput('coins', [
      buildCoin({ image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' }),
    ]);
    fixture.detectChanges();

    const img = (fixture.nativeElement as HTMLElement).querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe(
      'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    );
  });

  it('renders each card at the new, larger fixed size, chart-dominant', () => {
    fixture.componentRef.setInput('coins', [buildCoin({ sparkline: buildFullSparkline() })]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const card = nativeElement.querySelector('article') as HTMLElement;
    const chart = card.querySelector('svg') as SVGSVGElement;

    expect(card.className).toContain('w-72'); // wider than the previous w-48
    expect(chart.getAttribute('class')).toContain('h-36');
    expect(chart.getAttribute('class')).toContain('w-64');
    // The chart's own box (h-36 w-64 = 144x256px) is larger than the
    // rest of the card's content combined (header + price + change,
    // each a couple text lines) — it dominates the card by construction,
    // not just by convention.
  });

  it('hovering the chart at a known X position selects the correct array index and shows that point\'s price', () => {
    const sparkline = buildFullSparkline(); // 168 points, sparkline[i] = 60000 + i*10
    fixture.componentRef.setInput('coins', [buildCoin({ sparkline })]);
    fixture.detectChanges();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('article svg') as unknown as SVGSVGElement;
    mockChartRect(svg, { left: 0, width: 256 });

    // clientX at the exact right edge of a 256px-wide box maps to a
    // ratio of 1, selecting the last index (167): sparkline[167] = 61670.
    firePointerEvent(svg, 'pointermove', 256);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('$61,670.00');
  });

  it('shows the tooltip on touch (pointerdown) and hides it on release (pointerup)', () => {
    const sparkline = buildFullSparkline();
    fixture.componentRef.setInput('coins', [buildCoin({ sparkline })]);
    fixture.detectChanges();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('article svg') as unknown as SVGSVGElement;
    mockChartRect(svg, { left: 0, width: 256 });

    expect(component.hoverInfoFor(component.coins()[0])).toBeNull();

    firePointerEvent(svg, 'pointerdown', 0); // leftmost point, index 0
    fixture.detectChanges();
    let info = component.hoverInfoFor(component.coins()[0]);
    expect(info).not.toBeNull();
    expect(info?.price).toBe(sparkline[0]);

    firePointerEvent(svg, 'pointerup', 0);
    fixture.detectChanges();
    info = component.hoverInfoFor(component.coins()[0]);
    expect(info).toBeNull();
  });

  it('hides the tooltip when the pointer leaves the chart area', () => {
    const sparkline = buildFullSparkline();
    fixture.componentRef.setInput('coins', [buildCoin({ sparkline })]);
    fixture.detectChanges();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('article svg') as unknown as SVGSVGElement;
    mockChartRect(svg, { left: 0, width: 256 });

    firePointerEvent(svg, 'pointermove', 128);
    fixture.detectChanges();
    expect(component.hoverInfoFor(component.coins()[0])).not.toBeNull();

    firePointerEvent(svg, 'pointerleave', 128);
    fixture.detectChanges();
    expect(component.hoverInfoFor(component.coins()[0])).toBeNull();
  });

  it('never renders the tooltip price/day via innerHTML', () => {
    fixture.componentRef.setInput('coins', [buildCoin({ sparkline: buildFullSparkline() })]);
    fixture.detectChanges();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('article svg') as unknown as SVGSVGElement;
    mockChartRect(svg, { left: 0, width: 256 });
    firePointerEvent(svg, 'pointermove', 128);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('svg script')).toBeNull();
    expect(nativeElement.querySelector('article svg text')).toBeTruthy();
  });
});

describe('indexForPointerX', () => {
  it('selects index 0 at the left edge', () => {
    expect(indexForPointerX(0, 256, 168)).toBe(0);
  });

  it('selects the last index at the right edge', () => {
    expect(indexForPointerX(256, 256, 168)).toBe(167);
  });

  it('selects the nearest index at a known midpoint', () => {
    // Halfway across a 168-point array (indices 0..167) rounds to 84.
    expect(indexForPointerX(128, 256, 168)).toBe(84);
  });

  it('clamps to the last index when the pointer is beyond the right edge', () => {
    expect(indexForPointerX(500, 256, 168)).toBe(167);
  });

  it('clamps to the first index when the pointer is left of the box', () => {
    expect(indexForPointerX(-50, 256, 168)).toBe(0);
  });

  it('returns 0 for a zero-width box or fewer than 2 points, never dividing by zero', () => {
    expect(indexForPointerX(10, 0, 168)).toBe(0);
    expect(indexForPointerX(10, 256, 1)).toBe(0);
  });
});

describe('approxDayLabel', () => {
  const now = new Date('2026-09-13T12:00:00');

  it('labels the most recent point (index 167 of 168) as "Today"', () => {
    expect(approxDayLabel(167, 168, now)).toBe('Today');
  });

  it('labels a point 24 hours back (index 143 of 168) as "Yesterday"', () => {
    expect(approxDayLabel(143, 168, now)).toBe('Yesterday');
  });

  it('labels a point several days back with a short date', () => {
    // index 0 of 168 is 167 hours (~7 days) before `now`.
    expect(approxDayLabel(0, 168, now)).toBe('Sep 6');
  });
});
