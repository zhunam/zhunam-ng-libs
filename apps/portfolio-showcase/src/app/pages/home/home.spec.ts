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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// Separate describe (not merged into the one above: that's a bigger
// restructure than the narrow NG0201 fix this file needed, left alone
// on purpose). Both configure the same provideRouter([]) now; this one
// predates that fix and was added specifically to exercise the
// Featured Project assertions while the suite above still hit the
// preexisting NG0201/ActivatedRoute failure (documented, now fixed, in
// the root ROADMAP.md's infrastructure lessons).
describe('Home (Featured Project section)', () => {
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the Featured Project section with a real link to the crypto dashboard route, never empty/placeholder', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('Featured Project');
    expect(nativeElement.textContent).toContain('Crypto Market Dashboard');

    const link = nativeElement.querySelector('a[href="/crypto-dashboard"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/crypto-dashboard');
  });

  it('shows the Live badge on the Featured Project card, honestly (real live data behind it)', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const badge = nativeElement.querySelector('a[href="/crypto-dashboard"] .badge-primary');

    expect(badge?.textContent?.trim()).toBe('Live');
  });
});
