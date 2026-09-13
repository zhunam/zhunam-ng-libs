import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CryptoDashboard } from './crypto-dashboard';
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

// This page assembles several components that each inject
// CoinGeckoService independently (market-ticker, currency-converter,
// market-state) — one shared mock, provided once at the TestBed level,
// covers all of them, same instance Angular's DI hands to every
// consumer in this test.
function provideMockCoinGecko() {
  return {
    provide: CoinGeckoService,
    useValue: {
      getMarkets: vi.fn().mockResolvedValue([buildCoin(), buildCoin({ id: 'ethereum', symbol: 'eth', name: 'Ethereum' })]),
      getTrending: vi.fn().mockResolvedValue([buildCoin()]),
      getSupportedCurrencies: vi.fn().mockResolvedValue(['usd', 'eur', 'btc', 'eth']),
      getSimplePrice: vi.fn().mockResolvedValue(65000),
      getGlobalStats: vi.fn().mockResolvedValue(sampleStats),
    },
  };
}

describe('CryptoDashboard', () => {
  let fixture: ComponentFixture<CryptoDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CryptoDashboard],
      providers: [provideRouter([]), provideMockCoinGecko()],
    }).compileComponents();

    fixture = TestBed.createComponent(CryptoDashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders every assembled component on the real route page (integration, not re-testing each component\'s own behavior)', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('app-market-ticker')).toBeTruthy();
    expect(nativeElement.querySelector('app-market-state')).toBeTruthy();
    expect(nativeElement.querySelector('app-trending-carousel')).toBeTruthy();
    expect(nativeElement.querySelector('app-market-table')).toBeTruthy();
    expect(nativeElement.querySelector('app-price-ticker')).toBeTruthy();
    expect(nativeElement.querySelector('app-currency-converter')).toBeTruthy();
  });

  it('has a real breadcrumb link back to home, not a placeholder', () => {
    const homeLink = (fixture.nativeElement as HTMLElement).querySelector('a[href="/"]');
    expect(homeLink).toBeTruthy();
  });
});
