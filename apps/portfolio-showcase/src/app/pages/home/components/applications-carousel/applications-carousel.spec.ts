import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { applications } from '../../../../shared/applications';
import { ApplicationsCarousel } from './applications-carousel';

describe('ApplicationsCarousel', () => {
  let fixture: ComponentFixture<ApplicationsCarousel>;
  let notifyResize: () => void;

  beforeEach(async () => {
    // The test DOM has no layout, so the observer is faked and the track's
    // dimensions are set by hand per test.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notifyResize = callback;
        }
        observe(): void {
          // Driven manually through notifyResize.
        }
        disconnect(): void {
          // Nothing to release in the fake.
        }
      },
    );

    await TestBed.configureTestingModule({
      imports: [ApplicationsCarousel],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationsCarousel);
    fixture.componentRef.setInput('applications', applications);
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  function setTrackSize(clientWidth: number, scrollWidth: number): void {
    const track = (fixture.nativeElement as HTMLElement).querySelector('.track') as HTMLElement;
    Object.defineProperty(track, 'clientWidth', { value: clientWidth });
    Object.defineProperty(track, 'scrollWidth', { value: scrollWidth });
    notifyResize();
    fixture.detectChanges();
  }

  it('renders one slide per application', () => {
    const slides = (fixture.nativeElement as HTMLElement).querySelectorAll('.slide');
    expect(slides.length).toBe(applications.length);
  });

  it('shows no arrows when every card fits', () => {
    setTrackSize(1200, 1200);
    expect((fixture.nativeElement as HTMLElement).querySelector('.arrow')).toBeNull();
  });

  it('renders one dot per reachable position and scrolls to it on click', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const track = nativeElement.querySelector('.track') as HTMLElement;
    const scrollTo = vi.fn();
    track.scrollTo = scrollTo;
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    nativeElement.querySelectorAll<HTMLElement>('.slide').forEach((slide, index) => {
      slide.getBoundingClientRect = () => ({ left: index * 300 }) as DOMRect;
    });

    setTrackSize(300, 300 * applications.length);
    const dots = nativeElement.querySelectorAll<HTMLButtonElement>('.dot');

    expect(dots.length).toBe(applications.length);
    expect(dots[0].getAttribute('aria-current')).toBe('true');
    expect(dots[1].getAttribute('aria-label')).toBe(`Show ${applications[1].name}`);

    dots[1].click();
    expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' });
  });

  it('shows arrows once the track overflows, with "previous" disabled at the start', () => {
    setTrackSize(1200, 2000);
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector<HTMLButtonElement>('.arrow--prev')?.disabled).toBe(true);
    expect(nativeElement.querySelector<HTMLButtonElement>('.arrow--next')?.disabled).toBe(false);
  });
});
