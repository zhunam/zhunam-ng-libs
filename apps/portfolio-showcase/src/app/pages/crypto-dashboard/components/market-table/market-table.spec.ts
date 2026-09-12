import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketTable } from './market-table';
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

describe('MarketTable', () => {
  let component: MarketTable;
  let fixture: ComponentFixture<MarketTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketTable],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketTable);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('coins', [buildCoin()]);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders one row per coin', () => {
    fixture.componentRef.setInput('coins', [
      buildCoin({ id: 'bitcoin', name: 'Bitcoin' }),
      buildCoin({ id: 'ethereum', name: 'Ethereum' }),
      buildCoin({ id: 'solana', name: 'Solana' }),
    ]);
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it('colors the 24h change cell green for a positive change', () => {
    fixture.componentRef.setInput('coins', [buildCoin({ changePercentage24h: 4.21 })]);
    fixture.detectChanges();

    const changeCell = (fixture.nativeElement as HTMLElement).querySelector(
      'tbody tr td:nth-child(6)',
    ) as HTMLElement;
    expect(changeCell.className).toContain('text-green-600');
    expect(changeCell.textContent).toContain('+4.21%');
  });

  it('colors the 24h change cell red for a negative change', () => {
    fixture.componentRef.setInput('coins', [buildCoin({ changePercentage24h: -2.5 })]);
    fixture.detectChanges();

    const changeCell = (fixture.nativeElement as HTMLElement).querySelector(
      'tbody tr td:nth-child(6)',
    ) as HTMLElement;
    expect(changeCell.className).toContain('text-red-600');
  });

  it('colors the 24h change cell neutral for a change of exactly 0', () => {
    fixture.componentRef.setInput('coins', [buildCoin({ changePercentage24h: 0 })]);
    fixture.detectChanges();

    const changeCell = (fixture.nativeElement as HTMLElement).querySelector(
      'tbody tr td:nth-child(6)',
    ) as HTMLElement;
    expect(changeCell.className).toContain('text-slate-600');
  });

  it('shows a loading coin-spinner instead of the table while coins() is empty', () => {
    fixture.componentRef.setInput('coins', []);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('table')).toBeNull();
    expect(nativeElement.textContent).toContain('Loading...');
  });

  it('shows an error coin-spinner with the given message instead of the table when error() is set', () => {
    fixture.componentRef.setInput('coins', [buildCoin()]);
    fixture.componentRef.setInput('error', 'Rate limit exceeded, try again shortly.');
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('table')).toBeNull();
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
