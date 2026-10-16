import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { applications } from '../../../../shared/applications';
import { ApplicationCard } from './application-card';

describe('ApplicationCard', () => {
  let fixture: ComponentFixture<ApplicationCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationCard);
  });

  it('renders an image preview with its alt text for an image-preview application', async () => {
    const imageApp = applications.find((app) => app.preview.kind === 'image');
    fixture.componentRef.setInput('application', imageApp);
    await fixture.whenStable();

    const img = (fixture.nativeElement as HTMLElement).querySelector('img');
    expect(img?.getAttribute('alt')).toBeTruthy();
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('renders the market miniature instead of an image for the crypto dashboard', async () => {
    const cryptoApp = applications.find((app) => app.preview.kind === 'market-miniature');
    fixture.componentRef.setInput('application', cryptoApp);
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('app-market-preview')).toBeTruthy();
    expect(nativeElement.querySelector('img')).toBeNull();
  });
});
