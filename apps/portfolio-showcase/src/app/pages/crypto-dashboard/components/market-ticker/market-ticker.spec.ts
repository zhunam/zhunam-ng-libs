import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketTicker } from './market-ticker';
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
  let component: MarketTicker;
  let fixture: ComponentFixture<MarketTicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketTicker],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketTicker);
    component = fixture.componentInstance;
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('should create', () => {
    fixture.componentRef.setInput('coins', [buildCoin()]);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('duplicates the given coins once for the seamless marquee loop', () => {
    fixture.componentRef.setInput('coins', [buildCoin(), buildCoin({ id: 'ethereum', symbol: 'eth' })]);
    fixture.detectChanges();

    expect(component.trackCoins().length).toBe(4);
  });

  it('colors a positive-change coin green', () => {
    fixture.componentRef.setInput('coins', [buildCoin({ changePercentage24h: 4.21 })]);
    fixture.detectChanges();

    expect(root().querySelector('span.text-green-600')).toBeTruthy();
  });

  it('colors a negative-change coin red', () => {
    fixture.componentRef.setInput('coins', [buildCoin({ changePercentage24h: -2.5 })]);
    fixture.detectChanges();

    expect(root().querySelector('span.text-red-600')).toBeTruthy();
  });

  it('shows a loading coin-spinner instead of the marquee while coins() is empty', () => {
    fixture.componentRef.setInput('coins', []);
    fixture.detectChanges();

    expect(root().textContent).toContain('Loading...');
  });

  it('shows an error coin-spinner with the given message instead of the marquee when error() is set', () => {
    fixture.componentRef.setInput('coins', [buildCoin()]);
    fixture.componentRef.setInput('error', 'Could not load market data.');
    fixture.detectChanges();

    expect(root().textContent).toContain('Could not load market data.');
    expect(root().querySelector('.market-ticker')).toBeNull();
  });

  it('emits retry() when the error state\'s retry control is clicked', () => {
    fixture.componentRef.setInput('coins', [buildCoin()]);
    fixture.componentRef.setInput('error', 'Network error.');
    fixture.detectChanges();

    let retryCount = 0;
    component.retry.subscribe(() => retryCount++);

    const button = root().querySelector('button') as HTMLButtonElement;
    button.click();

    expect(retryCount).toBe(1);
  });

  it('never renders coin data via innerHTML', () => {
    fixture.componentRef.setInput('coins', [buildCoin({ symbol: '<b>btc</b>' })]);
    fixture.detectChanges();

    expect(root().querySelector('b')).toBeNull();
    expect(root().textContent).toContain('<b>btc</b>');
  });
});
