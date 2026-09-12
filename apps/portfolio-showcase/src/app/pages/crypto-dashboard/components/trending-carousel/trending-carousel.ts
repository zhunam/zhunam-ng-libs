import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { CryptoCoin } from '../../models/coin';
import { priceDirection } from '../../utils/price-direction';
import { CoinSpinner } from '../coin-spinner/coin-spinner';

const SPARKLINE_WIDTH = 100;
const SPARKLINE_HEIGHT = 32;

type ChangeColor = 'text-green-600' | 'text-red-600' | 'text-slate-600';

@Component({
  selector: 'app-trending-carousel',
  imports: [CurrencyPipe, DecimalPipe, CoinSpinner],
  templateUrl: './trending-carousel.html',
  styleUrl: './trending-carousel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendingCarousel {
  coins = input.required<CryptoCoin[]>();
  error = input<string | null>(null);

  // Not asked for explicitly, but coin-spinner's error variant always
  // renders a retry button; leaving it unwired would be a dead control
  // that looks actionable but does nothing (same pattern already added
  // to market-table for the same reason).
  retry = output<void>();

  @ViewChild('scrollContainer')
  private scrollContainerRef!: ElementRef<HTMLElement>;

  private readonly atStartSignal = signal(true);
  private readonly atEndSignal = signal(true);
  readonly atStart = this.atStartSignal.asReadonly();
  readonly atEnd = this.atEndSignal.asReadonly();

  constructor() {
    // The scroll container's content width changes whenever coins()
    // changes; re-measure once the DOM has actually updated (queued as a
    // microtask, since the ViewChild's element still reflects the old
    // content width at the moment this effect itself runs).
    effect(() => {
      this.coins();
      queueMicrotask(() => this.updateScrollEdges());
    });
  }

  onRetryClick(): void {
    this.retry.emit();
  }

  onScroll(): void {
    this.updateScrollEdges();
  }

  scrollByCard(direction: 1 | -1): void {
    const container = this.scrollContainerRef.nativeElement;
    const amount = container.clientWidth * 0.8 * direction;
    // Verified empirically (Playwright, reducedMotion: 'reduce' emulation):
    // an explicit behavior:'smooth' still animates over ~18 frames even
    // though the global styles.css rule forces scroll-behavior: auto on
    // the element. Unlike a CSS animation/transition, JS-specified
    // behavior overrides the CSS property entirely, so it needs its own
    // check here.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollBy({ left: amount, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
  }

  changeColorFor(coin: CryptoCoin): ChangeColor {
    switch (priceDirection(coin.changePercentage24h)) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  }

  linePathFor(coin: CryptoCoin): string {
    const points = this.pointsFor(coin.sparkline);
    if (points.length === 0) {
      return '';
    }
    return `M${points[0].x},${points[0].y} L${points
      .slice(1)
      .map((p) => `${p.x},${p.y}`)
      .join(' L')}`;
  }

  areaPathFor(coin: CryptoCoin): string {
    const line = this.linePathFor(coin);
    if (!line) {
      return '';
    }
    return `${line} L${SPARKLINE_WIDTH},${SPARKLINE_HEIGHT} L0,${SPARKLINE_HEIGHT} Z`;
  }

  private pointsFor(values: number[]): { x: number; y: number }[] {
    if (values.length < 2) {
      return [];
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1; // avoid divide-by-zero on a perfectly flat line
    return values.map((value, index) => ({
      x: (index / (values.length - 1)) * SPARKLINE_WIDTH,
      y: SPARKLINE_HEIGHT - ((value - min) / range) * SPARKLINE_HEIGHT,
    }));
  }

  private updateScrollEdges(): void {
    const el = this.scrollContainerRef?.nativeElement;
    if (!el) {
      return;
    }
    this.atStartSignal.set(el.scrollLeft <= 0);
    this.atEndSignal.set(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }
}
