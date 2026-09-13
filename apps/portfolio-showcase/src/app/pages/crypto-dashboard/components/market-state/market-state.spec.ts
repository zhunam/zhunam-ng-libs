import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketState } from './market-state';
import { CoinGeckoService } from '../../services/coingecko';
import { GlobalMarketStats } from '../../models/coin';

const sampleStats: GlobalMarketStats = {
  totalMarketCapByCurrency: { usd: 2_654_490_015_954.5, eur: 2_288_403_988_874.2 },
  totalVolumeByCurrency: { usd: 107_207_728_882.8, eur: 92_422_496_577.1 },
  marketCapChangePercentage24hUsd: -2.43,
  volumeChangePercentage24hUsd: 5.12,
  dominanceByCoin: { btc: 58.17, eth: 11.65 },
  activeCryptocurrencies: 21084,
};
const sampleCurrencies = ['usd', 'eur'];

function root(fixture: ComponentFixture<MarketState>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('MarketState', () => {
  let getGlobalStatsSpy: ReturnType<typeof vi.fn>;
  let getSupportedCurrenciesSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getGlobalStatsSpy = vi.fn().mockResolvedValue(sampleStats);
    getSupportedCurrenciesSpy = vi.fn().mockResolvedValue(sampleCurrencies);

    await TestBed.configureTestingModule({
      imports: [MarketState],
      providers: [
        {
          provide: CoinGeckoService,
          useValue: {
            getGlobalStats: getGlobalStatsSpy,
            getSupportedCurrencies: getSupportedCurrenciesSpy,
          },
        },
      ],
    }).compileComponents();
  });

  async function createSettledFixture(): Promise<ComponentFixture<MarketState>> {
    const fixture = TestBed.createComponent(MarketState);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('should create', async () => {
    const fixture = await createSettledFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders dominance, total market cap/volume (default USD), and active cryptocurrencies from /global', async () => {
    const fixture = await createSettledFixture();
    const text = root(fixture).textContent ?? '';

    expect(text).toContain('2,654,490,015,955'); // total market cap, USD, rounded to whole units
    expect(text).toContain('107,207,728,883'); // total volume, USD
    expect(text).toContain('21,084'); // active cryptocurrencies
    // "btc"/"eth" are rendered lowercase in the DOM; the visual uppercase
    // comes from a CSS `text-transform`, which doesn't change textContent
    // (same lesson already learned building price-ticker).
    expect(text).toContain('btc');
    expect(text).toContain('58.17');
    expect(text).toContain('eth');
    expect(text).toContain('11.65');
  });

  it('changing the currency selector updates cap/volume to the same response\'s eur key, without a new API call', async () => {
    const fixture = await createSettledFixture();
    getGlobalStatsSpy.mockClear();

    const select = root(fixture).querySelector('select') as HTMLSelectElement;
    select.value = 'eur';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const text = root(fixture).textContent ?? '';
    expect(text).toContain('2,288,403,988,874'); // eur market cap from the SAME cached response
    expect(text).toContain('92,422,496,577'); // eur volume
    expect(getGlobalStatsSpy).not.toHaveBeenCalled(); // no new /global call just for switching currency
  });

  it('shows the 24h change of cap/volume in USD regardless of the selected currency', async () => {
    const fixture = await createSettledFixture();

    const select = root(fixture).querySelector('select') as HTMLSelectElement;
    select.value = 'eur';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const text = root(fixture).textContent ?? '';
    expect(text).toContain('-2.43%');
    expect(text).toContain('+5.12%');
    expect(text).toContain('USD'); // labeled explicitly, doesn't silently look like it tracks eur
  });

  it('colors a negative 24h market cap change red and a positive volume change green', async () => {
    const fixture = await createSettledFixture();
    const component = fixture.componentInstance;

    expect(component.marketCapChangeColor()).toBe('text-red-600');
    expect(component.volumeChangeColor()).toBe('text-green-600');
  });

  it('shows a loading coin-spinner before the first response arrives', () => {
    getGlobalStatsSpy.mockReturnValue(new Promise<never>(() => undefined));
    const fixture = TestBed.createComponent(MarketState);
    fixture.detectChanges();

    expect(root(fixture).textContent).toContain('Loading...');
  });

  it('shows an error coin-spinner with a functional retry when /global fails', async () => {
    getGlobalStatsSpy.mockRejectedValueOnce(new Error('network error'));
    const fixture = TestBed.createComponent(MarketState);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root(fixture).textContent).toContain('Could not load global market stats.');

    getGlobalStatsSpy.mockResolvedValue(sampleStats);
    const retryButton = root(fixture).querySelector('button') as HTMLButtonElement;
    retryButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getGlobalStatsSpy).toHaveBeenCalledTimes(2);
    expect(root(fixture).textContent).not.toContain('Could not load global market stats.');
  });

  it('never renders currency codes via innerHTML', async () => {
    getSupportedCurrenciesSpy.mockResolvedValue(['<b>usd</b>']);
    const fixture = await createSettledFixture();

    expect(root(fixture).querySelector('b')).toBeNull();
  });
});
