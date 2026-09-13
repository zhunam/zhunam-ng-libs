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

// Chosen to exactly match the chart box's own rendered CSS pixel size
// (see the template's h-36/w-64 classes on the sparkline SVG): with
// preserveAspectRatio="none" mapping this viewBox onto a same-ratio
// box, the scale factor is 1:1 in both axes, so nothing (stroke width,
// the marker circle, tooltip text) gets stretched into an oval/ribbon.
// This is the same distortion class of bug found and fixed in the
// crypto-dashboard hero (vector-effect="non-scaling-stroke" there);
// here it's avoided at the source instead, since the interactive
// marker/tooltip geometry (not just a stroke) would otherwise also
// distort under a non-uniform scale, which non-scaling-stroke alone
// doesn't fix.
const SPARKLINE_WIDTH = 256;
const SPARKLINE_HEIGHT = 144;

const TOOLTIP_WIDTH = 84;
const TOOLTIP_HEIGHT = 34;
const TOOLTIP_GAP = 10;

const MARKER_COLOR_UP = '#16a34a'; // Tailwind green-600, same value used by text-green-600 elsewhere
const MARKER_COLOR_DOWN = '#dc2626'; // Tailwind red-600
const MARKER_COLOR_NEUTRAL = '#475569'; // Ink Muted / slate-600

type ChangeColor = 'text-green-600' | 'text-red-600' | 'text-slate-600';

interface Point {
  x: number;
  y: number;
}

interface HoverState {
  coinId: string;
  index: number;
}

export interface HoverInfo {
  pointX: number;
  pointY: number;
  price: number;
  dayLabel: string;
  markerColor: string;
  boxX: number;
  boxY: number;
  textCenterX: number;
  priceTextY: number;
  dayTextY: number;
}

/**
 * Nearest sparkline index for a pointer's X position within the
 * chart's own rendered box. Deliberately independent of the SVG
 * viewBox's internal coordinate scale: `localX`/`rectWidth` are real
 * CSS pixels (the pointer event's position offset from the box's own
 * left edge, and the box's own rendered width via
 * getBoundingClientRect()), so this stays correct even if the chart's
 * rendered size ever differs from SPARKLINE_WIDTH/HEIGHT.
 */
export function indexForPointerX(localX: number, rectWidth: number, pointCount: number): number {
  if (rectWidth <= 0 || pointCount < 2) {
    return 0;
  }
  const ratio = Math.min(Math.max(localX / rectWidth, 0), 1);
  return Math.round(ratio * (pointCount - 1));
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Calendar-day label for a sparkline index ("Today", "Yesterday", or
 * a short date). The 168-point sparkline array is oldest-to-newest,
 * one point per hour, with no per-point timestamp in the API response
 * (confirmed in ROADMAP.md) — this derives an APPROXIMATION by
 * counting back from `now` in fixed 1-hour steps per index, assuming
 * perfectly uniform hourly spacing. It is not a real timestamp CoinGecko
 * provides for this point; presenting it as more precise than that
 * would be exactly the kind of fabricated precision this project's
 * design system explicitly avoids elsewhere (see DESIGN.md's
 * no-fabricated-facts rule).
 */
export function approxDayLabel(index: number, totalPoints: number, now: Date = new Date()): string {
  const hoursAgo = totalPoints - 1 - index;
  const pointDate = new Date(now.getTime() - hoursAgo * MS_PER_HOUR);
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(pointDate).getTime()) / MS_PER_DAY);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(pointDate);
}

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

  readonly sparklineWidth = SPARKLINE_WIDTH;
  readonly sparklineHeight = SPARKLINE_HEIGHT;
  readonly tooltipWidth = TOOLTIP_WIDTH;
  readonly tooltipHeight = TOOLTIP_HEIGHT;

  @ViewChild('scrollContainer')
  private scrollContainerRef!: ElementRef<HTMLElement>;

  private readonly atStartSignal = signal(true);
  private readonly atEndSignal = signal(true);
  readonly atStart = this.atStartSignal.asReadonly();
  readonly atEnd = this.atEndSignal.asReadonly();

  // Only one card's chart can be actively hovered/touched at a time.
  private readonly hoverSignal = signal<HoverState | null>(null);

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

  // Shared by pointerdown (a tap with no drag, touch's only event
  // besides pointerup) and pointermove (mouse hover-scrub, and
  // touch drag-scrub once already down).
  onPointerActive(event: PointerEvent, coin: CryptoCoin): void {
    const target = event.currentTarget as SVGSVGElement;
    target.setPointerCapture(event.pointerId);
    const rect = target.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const index = indexForPointerX(localX, rect.width, coin.sparkline.length);
    this.hoverSignal.set({ coinId: coin.id, index });
  }

  onPointerInactive(coin: CryptoCoin): void {
    if (this.hoverSignal()?.coinId === coin.id) {
      this.hoverSignal.set(null);
    }
  }

  hoverInfoFor(coin: CryptoCoin): HoverInfo | null {
    const hover = this.hoverSignal();
    if (!hover || hover.coinId !== coin.id) {
      return null;
    }
    const points = this.pointsFor(coin.sparkline);
    const point = points[hover.index];
    const price = coin.sparkline[hover.index];
    if (!point || price === undefined) {
      return null;
    }

    const boxX = Math.min(
      Math.max(point.x - TOOLTIP_WIDTH / 2, 2),
      SPARKLINE_WIDTH - TOOLTIP_WIDTH - 2,
    );
    const fitsAbove = point.y - TOOLTIP_HEIGHT - TOOLTIP_GAP >= 0;
    const boxY = fitsAbove ? point.y - TOOLTIP_HEIGHT - TOOLTIP_GAP : point.y + TOOLTIP_GAP;

    return {
      pointX: point.x,
      pointY: point.y,
      price,
      dayLabel: approxDayLabel(hover.index, coin.sparkline.length),
      markerColor: this.markerColorFor(coin),
      boxX,
      boxY,
      textCenterX: boxX + TOOLTIP_WIDTH / 2,
      priceTextY: boxY + 15,
      dayTextY: boxY + 28,
    };
  }

  private markerColorFor(coin: CryptoCoin): string {
    switch (priceDirection(coin.changePercentage24h)) {
      case 'up':
        return MARKER_COLOR_UP;
      case 'down':
        return MARKER_COLOR_DOWN;
      default:
        return MARKER_COLOR_NEUTRAL;
    }
  }

  private pointsFor(values: number[]): Point[] {
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
