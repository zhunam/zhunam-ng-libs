import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PriceTicker } from './price-ticker';
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

describe('PriceTicker', () => {
  let component: PriceTicker;
  let fixture: ComponentFixture<PriceTicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriceTicker],
    }).compileComponents();

    fixture = TestBed.createComponent(PriceTicker);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('coin', buildCoin());
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders the coin name, symbol, and formatted price', () => {
    fixture.componentRef.setInput(
      'coin',
      buildCoin({ name: 'Ethereum', symbol: 'eth', currentPrice: 3200.5 }),
    );
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ethereum');
    // "eth" is rendered lowercase in the DOM; the visual uppercase comes
    // from a CSS `text-transform`, which doesn't change textContent.
    expect(text).toContain('eth');
    expect(text).toContain('3,200.50');
  });

  it('marks a positive change as "positive" and colors it green', () => {
    fixture.componentRef.setInput('coin', buildCoin({ changePercentage24h: 4.21 }));
    fixture.detectChanges();

    expect(component.changeDirection()).toBe('positive');
    const changeEl = (fixture.nativeElement as HTMLElement).querySelector('.text-green-600');
    expect(changeEl).toBeTruthy();
    expect(changeEl?.textContent).toContain('+4.21%');
  });

  it('marks a negative change as "negative" and colors it red', () => {
    fixture.componentRef.setInput('coin', buildCoin({ changePercentage24h: -2.5 }));
    fixture.detectChanges();

    expect(component.changeDirection()).toBe('negative');
    const changeEl = (fixture.nativeElement as HTMLElement).querySelector('.text-red-600');
    expect(changeEl).toBeTruthy();
    expect(changeEl?.textContent).toContain('-2.50%');
  });

  it('marks a change of exactly 0 as "neutral", not positive or negative', () => {
    fixture.componentRef.setInput('coin', buildCoin({ changePercentage24h: 0 }));
    fixture.detectChanges();

    expect(component.changeDirection()).toBe('neutral');
    const changeEl = (fixture.nativeElement as HTMLElement).querySelector('.text-slate-600');
    expect(changeEl).toBeTruthy();
  });

  it('does not flash on the very first render', async () => {
    fixture.componentRef.setInput('coin', buildCoin());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.flashing()).toBe(false);
  });

  it('flashes when coin() changes to a new value after the first render', async () => {
    fixture.componentRef.setInput('coin', buildCoin({ currentPrice: 100 }));
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('coin', buildCoin({ currentPrice: 101 }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.flashing()).toBe(true);
  });

  it('stops flashing once the CSS animation ends', async () => {
    fixture.componentRef.setInput('coin', buildCoin({ currentPrice: 100 }));
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('coin', buildCoin({ currentPrice: 101 }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.flashing()).toBe(true);

    component.onFlashAnimationEnd();

    expect(component.flashing()).toBe(false);
  });
});
