import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { AppTitleStrategy } from './app-title-strategy';
import { appRoutes } from './app.routes';

describe('AppTitleStrategy', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter(appRoutes), { provide: TitleStrategy, useClass: AppTitleStrategy }],
    }).compileComponents();
  });

  it('prefixes every route title with "zhunam-dev | "', async () => {
    const router = TestBed.inject(Router);
    const title = TestBed.inject(Title);

    await router.navigate(['/crypto-dashboard']);
    expect(title.getTitle()).toBe('zhunam-dev | Crypto Market Dashboard');

    await router.navigate(['/data-grid']);
    expect(title.getTitle()).toBe('zhunam-dev | Data Grid');

    await router.navigate(['/']);
    expect(title.getTitle()).toBe('zhunam-dev | Home');
  });
});
