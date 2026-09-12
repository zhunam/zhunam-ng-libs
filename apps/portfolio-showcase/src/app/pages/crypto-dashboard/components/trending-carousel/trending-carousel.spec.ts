import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrendingCarousel } from './trending-carousel';
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
});
