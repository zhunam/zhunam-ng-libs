import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output } from '@angular/core';
import type { CalendarEvent } from '@zhunam/calendar';
import {
  CalendarDatePipe,
  CalendarDayViewComponent,
  CalendarMonthViewComponent,
  CalendarNextViewDirective,
  CalendarPreviousViewDirective,
  CalendarTodayDirective,
  CalendarWeekViewComponent,
  DateAdapter,
  provideCalendar,
} from 'angular-calendar';
import type {
  CalendarEvent as NgCalendarEvent,
  CalendarEventTimesChangedEvent,
  CalendarMonthViewDay,
} from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { mapToAngularCalendarEvent } from './internal/map-to-angular-calendar-event';

/**
 * Which month/week/day view is currently shown. A plain string union,
 * not `angular-calendar`'s own `CalendarView` enum: no type from
 * `angular-calendar` is exported from this entry point's public barrel,
 * the values happen to be structurally the same strings that library's
 * `view` inputs accept, confirmed against the real installed package.
 */
export type CalendarBoardViewMode = 'month' | 'week' | 'day';

/**
 * A visible date range, half-open `[start, end)`, same convention as
 * `CalendarStore`/`GoogleCalendarConnector`.
 */
export interface CalendarBoardVisibleRange {
  start: Date;
  end: Date;
}

/**
 * A rescheduled event: `id` of the original `CalendarEvent`, plus its
 * new `start`/`end` after a drag or resize.
 */
export interface CalendarBoardReschedule {
  id: string;
  start: Date;
  end: Date;
}

/**
 * Month/week/day calendar board, built on `angular-calendar` internally
 * (never exposed: no type from that package appears anywhere in this
 * component's own public inputs/outputs). Renders `events()`, lets the
 * user navigate between months/weeks/days and switch `viewMode()`, and
 * reports clicks and drag/resize reschedules back as this library's own
 * `CalendarEvent<T>`, never `angular-calendar`'s internal event shape.
 *
 * `angular-calendar` requires a `DateAdapter` from either the `date-fns`
 * or `moment` peer package; this component provides one itself
 * (`date-fns`, confirmed with a real build+render, not just reading
 * types, that `provideCalendar()` works declared on a single
 * component's own `providers`, no app-wide setup needed).
 */
@Component({
  selector: 'lib-calendar-board',
  imports: [
    CalendarDatePipe,
    CalendarPreviousViewDirective,
    CalendarNextViewDirective,
    CalendarTodayDirective,
    CalendarMonthViewComponent,
    CalendarWeekViewComponent,
    CalendarDayViewComponent,
  ],
  providers: [provideCalendar({ provide: DateAdapter, useFactory: adapterFactory })],
  templateUrl: './calendar-board.html',
  styleUrl: './calendar-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarBoard<T = unknown> {
  private readonly dateAdapter = inject(DateAdapter);

  /**
   * Events to display. A recurring event (`recurrence` set) is shown
   * as a single non-draggable, non-resizable card: this component
   * doesn't expand recurrence into individual occurrences, pass
   * already-expanded events (e.g. from `CalendarStore.eventsInRange()`)
   * if that's what should render.
   */
  readonly events = input.required<CalendarEvent<T>[]>();

  /**
   * The currently shown view. Two-way bindable.
   * @default 'month'
   */
  readonly viewMode = model<CalendarBoardViewMode>('month');

  /**
   * The date the current view is centered/anchored on. Two-way
   * bindable; navigating (previous/next/today) updates it.
   */
  readonly viewDate = model<Date>(new Date());

  /**
   * Emitted with the original `CalendarEvent<T>` when its card is
   * clicked (month/week/day views all funnel through the same
   * handler, `angular-calendar` uses the same output shape for all
   * three, confirmed against the real installed package).
   */
  readonly eventClick = output<CalendarEvent<T>>();

  /**
   * Emitted after a drag or resize, with the moved/resized event's
   * `id` and its new `start`/`end`. Never emitted for an event whose
   * `recurrence` is set: those are mapped as non-draggable,
   * non-resizable (see `mapToAngularCalendarEvent()`), and confirmed
   * (by reading `angular-calendar`'s own compiled template, not just
   * its docs) that the engine actually disables the drag/resize
   * directives for those, not just documents the flags.
   */
  readonly eventReschedule = output<CalendarBoardReschedule>();

  /**
   * Emitted with the visible date range whenever `viewDate()`/
   * `viewMode()` changes.
   */
  readonly visibleRangeChange = output<CalendarBoardVisibleRange>();

  /**
   * `events()` mapped to `angular-calendar`'s own shape. `computed()`,
   * not recalculated by hand in the template: re-derives only when
   * `events()` itself changes.
   */
  protected readonly angularCalendarEvents = computed(() => this.events().map((event) => mapToAngularCalendarEvent(event)));

  /**
   * The visible range for the current `viewDate()`/`viewMode()`, via
   * the injected `DateAdapter`'s real `startOf`/`add` methods
   * (confirmed against the real installed package). A plain
   * `computed()`, kept separate from the `effect()` that actually emits
   * it below: computing the range itself has no side effect and is
   * independently useful/testable, only turning it into an
   * `@Output()` emission needs an `effect()`.
   *
   * Deliberately NOT `dateAdapter.endOfMonth()`/`endOfWeek()`/
   * `endOfDay()`: confirmed empirically (real `date-fns` adapter, not
   * assumed) that those return `23:59:59.999` of the last day, an
   * *inclusive* end, not the exclusive `[start, end)` this library
   * uses everywhere else (`CalendarStore`, `GoogleCalendarConnector`'s
   * `timeMin`/`timeMax`). Using them as-is here would make this
   * component's own `visibleRangeChange` the one inconsistent range
   * shape in the library. Start-of-the-*next*-period instead
   * (`addMonths`/`addWeeks`/`addDays` on the period's own `start`) is a
   * real, exact midnight boundary, confirmed the same way.
   */
  private readonly visibleRange = computed<CalendarBoardVisibleRange>(() => {
    const date = this.viewDate();

    switch (this.viewMode()) {
      case 'week': {
        const start = this.dateAdapter.startOfWeek(date);
        return { start, end: this.dateAdapter.addWeeks(start, 1) };
      }
      case 'day': {
        const start = this.dateAdapter.startOfDay(date);
        return { start, end: this.dateAdapter.addDays(start, 1) };
      }
      case 'month':
      default: {
        const start = this.dateAdapter.startOfMonth(date);
        return { start, end: this.dateAdapter.addMonths(start, 1) };
      }
    }
  });

  constructor() {
    effect(() => {
      this.visibleRangeChange.emit(this.visibleRange());
    });
  }

  /**
   * `event` here is `angular-calendar`'s own, non-generic `CalendarEvent`
   * (its view components don't propagate our `T` through their own
   * `events: CalendarEvent[]` input, confirmed against the real
   * installed types), so `.meta` comes back typed `any`; the cast back
   * to `CalendarEvent<T>` is this component's own invariant
   * (`mapToAngularCalendarEvent()` always sets `meta` to the original
   * event), not a type this library received from `angular-calendar`.
   */
  protected onEventClicked({ event }: { event: NgCalendarEvent }): void {
    this.eventClick.emit(event.meta as CalendarEvent<T>);
  }

  protected onEventTimesChanged(change: CalendarEventTimesChangedEvent): void {
    const original = change.event.meta as CalendarEvent<T>;
    this.eventReschedule.emit({
      id: original.id,
      start: change.newStart,
      end: change.newEnd ?? original.end,
    });
  }

  /**
   * Jumps straight to day view for whichever day was clicked, empty or
   * not: seeing the full (empty or populated) schedule for that specific
   * day is a valid, simple result either way, no need to special-case an
   * empty day.
   */
  protected onDayClicked({ day }: { day: CalendarMonthViewDay }): void {
    this.viewDate.set(day.date);
    this.viewMode.set('day');
  }
}
