import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ApplicationEntry } from '../../../../shared/applications';
import { ApplicationCard } from '../application-card/application-card';

/** A scroll position the track can actually rest on, labeled by the card that leads it. */
interface SnapStop {
  left: number;
  leadingName: string;
}

/**
 * Horizontal scroll-snap track of application cards. Up to 3 fit side by
 * side on wide screens; arrows and dots only appear when the track actually
 * overflows (more than 3 apps, or a narrower viewport), so they never show
 * up as dead controls.
 */
@Component({
  selector: 'app-applications-carousel',
  imports: [ApplicationCard],
  templateUrl: './applications-carousel.html',
  styleUrl: './applications-carousel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationsCarousel {
  readonly applications = input.required<ApplicationEntry[]>();

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  protected readonly snapStops = signal<SnapStop[]>([]);
  protected readonly activeStop = signal(0);
  protected readonly canScrollPrev = signal(false);
  protected readonly canScrollNext = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      // Overflow and snap positions depend on the track's real width, which
      // changes with the viewport, not on any signal.
      const observer = new ResizeObserver(() => {
        this.measureSnapStops();
        this.updateScrollState();
      });
      observer.observe(this.track().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected updateScrollState(): void {
    const { scrollLeft, clientWidth, scrollWidth } = this.track().nativeElement;
    // 1px tolerance: scrollLeft is fractional on zoomed or high-DPI screens.
    this.canScrollPrev.set(scrollLeft > 1);
    this.canScrollNext.set(scrollLeft + clientWidth < scrollWidth - 1);

    const distances = this.snapStops().map((stop) => Math.abs(stop.left - scrollLeft));
    this.activeStop.set(distances.indexOf(Math.min(...distances)));
  }

  protected scrollByPage(direction: 1 | -1): void {
    const track = this.track().nativeElement;
    track.scrollBy({ left: direction * track.clientWidth, behavior: this.scrollBehavior() });
  }

  protected scrollToStop(stop: SnapStop): void {
    this.track().nativeElement.scrollTo({ left: stop.left, behavior: this.scrollBehavior() });
  }

  /**
   * One stop per card, except that cards near the end all clamp to the
   * maximum scroll (e.g. 5 cards, 3 per view: only 3 distinct stops), so
   * every dot moves the track somewhere different.
   */
  private measureSnapStops(): void {
    const track = this.track().nativeElement;
    const trackLeft = track.getBoundingClientRect().left;
    const scrollPadding = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
    const maxScroll = track.scrollWidth - track.clientWidth;

    const stops: SnapStop[] = [];
    Array.from(track.children).forEach((slide, index) => {
      const offset = slide.getBoundingClientRect().left - trackLeft + track.scrollLeft - scrollPadding;
      const left = Math.round(Math.min(Math.max(offset, 0), maxScroll));
      if (stops.every((stop) => Math.abs(stop.left - left) > 1)) {
        stops.push({ left, leadingName: this.applications()[index].name });
      }
    });
    this.snapStops.set(stops);
  }

  private scrollBehavior(): ScrollBehavior {
    return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }
}
