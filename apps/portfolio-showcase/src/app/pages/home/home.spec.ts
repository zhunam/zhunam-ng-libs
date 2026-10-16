import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the hero for the whole portfolio, linking to both applications and libraries', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('h1')?.textContent).not.toMatch(/^\s*Angular libraries/);
    expect(nativeElement.querySelector('a[href="#applications"]')).toBeTruthy();
    expect(nativeElement.querySelector('a[href="#library-explorer"]')).toBeTruthy();
  });

  it('links the crypto dashboard card to its internal route with the Live badge (real live data behind it)', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const link = nativeElement.querySelector('#applications a[href="/crypto-dashboard"]');

    expect(link?.textContent).toContain('Crypto Market Dashboard');
    expect(link?.querySelector('.badge-primary')?.textContent?.trim()).toBe('Live');
  });

  it('opens Luan Patterns in a new tab, without a Live badge (no live data behind it)', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const link = nativeElement.querySelector('#applications a[href="https://luan-patterns.pages.dev/"]');

    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
    expect(link?.querySelector('.badge-primary')).toBeNull();
  });
});
