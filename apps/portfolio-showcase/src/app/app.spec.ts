import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

@Component({ selector: 'app-stub', template: '' })
class StubComponent {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: StubComponent },
          { path: 'crypto-dashboard', component: StubComponent },
          { path: 'data-grid', component: StubComponent },
        ]),
      ],
    }).compileComponents();
  });

  it('should render the header brand link', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header a')?.textContent).toContain('Zhunam');
  });

  it('shows "MIT License" in the footer on every page except crypto-dashboard', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigate(['/data-grid']);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const footerText = (fixture.nativeElement as HTMLElement).querySelector('footer')?.textContent ?? '';
    expect(footerText).toContain('MIT License');
  });

  it('shows the crypto-dashboard-specific footer (no MIT License, a disclaimer, and CoinGecko attribution) only on that route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigate(['/crypto-dashboard']);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer') as HTMLElement;
    const footerText = footer.textContent ?? '';
    expect(footerText).not.toContain('MIT License');
    expect(footerText).toContain('not financial advice');

    // CoinGecko's API terms (section 4.4) require the exact phrase
    // "Powered by CoinGecko", displayed no smaller than font size 10,
    // linking to coingecko.com or coingecko.com/en/api/ per their own
    // brand guide's listed acceptable format.
    expect(footerText).toContain('Powered by');
    const attributionLink = footer.querySelector('a[href="https://www.coingecko.com/en/api/"]');
    expect(attributionLink).toBeTruthy();
    expect(attributionLink?.textContent).toContain('CoinGecko');
  });

  it('keeps the GitHub/LinkedIn footer links unchanged on crypto-dashboard, same hrefs as every other page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigate(['/crypto-dashboard']);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer') as HTMLElement;
    const githubLink = footer.querySelector('a[aria-label="GitHub"]');
    const linkedinLink = footer.querySelector('a[aria-label="LinkedIn"]');
    expect(githubLink?.getAttribute('href')).toBe('https://github.com/zhunam/zhunam-ng-libs');
    expect(linkedinLink?.getAttribute('href')).toBe('https://www.linkedin.com/in/ariana-andreina-mora');
  });

  it('never renders footer text via innerHTML', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigate(['/crypto-dashboard']);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer') as HTMLElement;
    expect(footer.querySelector('script')).toBeNull();
  });
});
