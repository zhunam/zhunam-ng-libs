import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { CalendarEvent } from '@zhunam/calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { CalendarBoard, CalendarBoardReschedule, CalendarBoardVisibleRange } from './calendar-board';

/**
 * A real physical drag/resize mouse gesture is notoriously fragile to
 * simulate in a headless test environment (same category of limitation
 * already documented for the OAuth popup in `google-calendar-connector.spec.ts`),
 * so it isn't attempted here. What IS tested with real confidence:
 * - This component renders for real with a component-level
 *   `provideCalendar()`/`DateAdapter` (no app-wide setup), the actual
 *   empirical proof requested for this task's point 1.
 * - The event mapping (`draggable`/`resizable` computed from
 *   `recurrence`, `meta` holding the original event) via
 *   `angularCalendarEvents()` directly, not by rendering DOM markup and
 *   inspecting it.
 * - `visibleRange`/`visibleRangeChange`, computed via the real
 *   `date-fns`-backed `DateAdapter` (never mocked), compared against
 *   values computed the same way in the test itself so the assertions
 *   don't depend on the test machine's own timezone.
 * - `onEventClicked()`/`onEventTimesChanged()`, this component's own
 *   handlers for `angular-calendar`'s `eventClicked`/`eventTimesChanged`
 *   outputs, called directly with a synthetic payload shaped exactly
 *   like what `angular-calendar` really emits: this is the "invocable
 *   without simulating the physical gesture" path the task asked to
 *   prefer, and it's this component's OWN logic (extracting `meta`,
 *   emitting our own shape) that's actually worth testing, not
 *   `angular-calendar`'s internal drag recognition.
 *
 * That `draggable: false`/`resizable: undefined` actually disable the
 * drag/resize directives (not just get set and ignored) was confirmed
 * separately by reading `angular-calendar`'s own compiled template
 * output, see `map-to-angular-calendar-event.ts`'s JSDoc.
 */
function buildEvent(id: string, start: string, end: string, extra?: Partial<CalendarEvent>): CalendarEvent {
  return { id, title: `Event ${id}`, start: new Date(start), end: new Date(end), ...extra };
}

function createFixture(events: CalendarEvent[] = []): ComponentFixture<CalendarBoard> {
  const fixture = TestBed.createComponent(CalendarBoard);
  fixture.componentRef.setInput('events', events);
  return fixture;
}

describe('CalendarBoard', () => {
  it('renders successfully with a component-level DateAdapter (real provideCalendar(), not app-wide)', () => {
    const fixture = createFixture([buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z')]);

    expect(() => fixture.detectChanges()).not.toThrow();
  });

  describe('event mapping', () => {
    it('maps a non-recurring event as draggable and resizable on both edges, meta holds the original', () => {
      const original = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      const fixture = createFixture([original]);
      fixture.detectChanges();

      const [mapped] = (fixture.componentInstance as unknown as { angularCalendarEvents(): Array<Record<string, unknown>> }).angularCalendarEvents();

      expect(mapped['draggable']).toBe(true);
      expect(mapped['resizable']).toEqual({ beforeStart: true, afterEnd: true });
      expect(mapped['meta']).toBe(original);
    });

    it('maps a recurring event as neither draggable nor resizable', () => {
      const recurring = buildEvent('2', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z', {
        recurrence: 'FREQ=DAILY;COUNT=3',
      });
      const fixture = createFixture([recurring]);
      fixture.detectChanges();

      const [mapped] = (fixture.componentInstance as unknown as { angularCalendarEvents(): Array<Record<string, unknown>> }).angularCalendarEvents();

      expect(mapped['draggable']).toBe(false);
      expect(mapped['resizable']).toBeUndefined();
      expect(mapped['meta']).toBe(recurring);
    });
  });

  describe('visibleRangeChange', () => {
    const adapter = adapterFactory();
    const viewDate = new Date('2026-09-15T12:00:00Z');

    function createBoundFixture(mode: 'month' | 'week' | 'day'): {
      fixture: ComponentFixture<CalendarBoard>;
      emitted: CalendarBoardVisibleRange[];
    } {
      const fixture = TestBed.createComponent(CalendarBoard);
      fixture.componentRef.setInput('events', []);
      fixture.componentRef.setInput('viewDate', viewDate);
      fixture.componentRef.setInput('viewMode', mode);
      const emitted: CalendarBoardVisibleRange[] = [];
      fixture.componentInstance.visibleRangeChange.subscribe((range) => emitted.push(range));
      return { fixture, emitted };
    }

    it('emits the exclusive month boundary (start of this month, start of next)', () => {
      const { fixture, emitted } = createBoundFixture('month');

      fixture.detectChanges();
      TestBed.flushEffects();

      const expectedStart = adapter.startOfMonth(viewDate);
      const expectedEnd = adapter.addMonths(expectedStart, 1);
      expect(emitted).toEqual([{ start: expectedStart, end: expectedEnd }]);
    });

    it('emits the exclusive week boundary (start of this week, start of next)', () => {
      const { fixture, emitted } = createBoundFixture('week');

      fixture.detectChanges();
      TestBed.flushEffects();

      const expectedStart = adapter.startOfWeek(viewDate);
      const expectedEnd = adapter.addWeeks(expectedStart, 1);
      expect(emitted).toEqual([{ start: expectedStart, end: expectedEnd }]);
    });

    it('emits the exclusive day boundary (start of this day, start of next)', () => {
      const { fixture, emitted } = createBoundFixture('day');

      fixture.detectChanges();
      TestBed.flushEffects();

      const expectedStart = adapter.startOfDay(viewDate);
      const expectedEnd = adapter.addDays(expectedStart, 1);
      expect(emitted).toEqual([{ start: expectedStart, end: expectedEnd }]);
    });

    it('emits again with new boundaries when viewMode changes', () => {
      const { fixture, emitted } = createBoundFixture('month');
      fixture.detectChanges();
      TestBed.flushEffects();
      expect(emitted).toHaveLength(1);

      fixture.componentRef.setInput('viewMode', 'day');
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(emitted).toHaveLength(2);
      const expectedStart = adapter.startOfDay(viewDate);
      const expectedEnd = adapter.addDays(expectedStart, 1);
      expect(emitted[1]).toEqual({ start: expectedStart, end: expectedEnd });
    });
  });

  describe('onEventClicked()', () => {
    it('emits the original CalendarEvent read from meta, never an angular-calendar object', () => {
      const fixture = createFixture();
      const original = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      const emitted: CalendarEvent[] = [];
      fixture.componentInstance.eventClick.subscribe((event) => emitted.push(event));

      (
        fixture.componentInstance as unknown as {
          onEventClicked(payload: { event: { meta: CalendarEvent }; sourceEvent: MouseEvent }): void;
        }
      ).onEventClicked({ event: { meta: original }, sourceEvent: new MouseEvent('click') });

      expect(emitted).toEqual([original]);
    });
  });

  describe('onDayClicked() (month view day cell click)', () => {
    // Jumps straight to day view for whichever day was clicked. No
    // "open day events" list (that was a previous iteration of this
    // task, reverted): a click just navigates, same result whether the
    // day has events or not.
    function getDayHandler(fixture: ComponentFixture<CalendarBoard>) {
      return fixture.componentInstance as unknown as {
        onDayClicked(payload: { day: { date: Date; events: unknown[] }; sourceEvent: MouseEvent }): void;
      };
    }

    it('sets viewDate to the clicked day and switches to day view, for a day with events', () => {
      const fixture = createFixture();
      fixture.detectChanges();
      const clickedDate = new Date('2026-09-15T00:00:00Z');

      getDayHandler(fixture).onDayClicked({
        day: { date: clickedDate, events: [{}] },
        sourceEvent: new MouseEvent('click'),
      });

      expect(fixture.componentInstance.viewDate()).toBe(clickedDate);
      expect(fixture.componentInstance.viewMode()).toBe('day');
    });

    it('does the same for a day with no events: seeing its empty schedule is a valid result too', () => {
      const fixture = createFixture();
      fixture.detectChanges();
      const emptyDate = new Date('2026-09-17T00:00:00Z');

      getDayHandler(fixture).onDayClicked({
        day: { date: emptyDate, events: [] },
        sourceEvent: new MouseEvent('click'),
      });

      expect(fixture.componentInstance.viewDate()).toBe(emptyDate);
      expect(fixture.componentInstance.viewMode()).toBe('day');
    });

    it('does not interfere with dragging/resizing a simple event (regression)', () => {
      // Same assertion as the pre-existing onEventTimesChanged() tests
      // below, but with a day already clicked first, to prove navigating
      // via a day click doesn't affect the pre-existing reschedule path.
      const fixture = createFixture();
      const original = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      const emitted: CalendarBoardReschedule[] = [];
      fixture.componentInstance.eventReschedule.subscribe((change) => emitted.push(change));
      getDayHandler(fixture).onDayClicked({
        day: { date: new Date('2026-09-15T00:00:00Z'), events: [{}] },
        sourceEvent: new MouseEvent('click'),
      });

      (
        fixture.componentInstance as unknown as {
          onEventTimesChanged(change: { type: string; event: { meta: CalendarEvent }; newStart: Date; newEnd?: Date }): void;
        }
      ).onEventTimesChanged({
        type: 'drag',
        event: { meta: original },
        newStart: new Date('2026-09-02T09:00:00Z'),
        newEnd: new Date('2026-09-02T11:00:00Z'),
      });

      expect(emitted).toEqual([
        { id: '1', start: new Date('2026-09-02T09:00:00Z'), end: new Date('2026-09-02T11:00:00Z') },
      ]);
    });
  });

  describe('month view "has events" indicator (no count)', () => {
    function inMonthDayCell(fixture: ComponentFixture<CalendarBoard>, dayNumber: number): HTMLElement {
      const root = fixture.nativeElement as HTMLElement;
      const cells = Array.from(root.querySelectorAll<HTMLElement>('.cal-cell.cal-in-month'));
      const match = cells.find((cell) => cell.querySelector('.cal-day-number')?.textContent?.trim() === String(dayNumber));
      if (!match) {
        throw new Error(`No in-month cell found for day ${dayNumber} in the rendered fixture.`);
      }
      return match;
    }

    it('renders the same-sized, count-less indicator for a day with 1 event and a day with 3, and none for a day with 0', () => {
      const events = [
        buildEvent('1', '2026-09-05T09:00:00Z', '2026-09-05T10:00:00Z'),
        buildEvent('2', '2026-09-10T09:00:00Z', '2026-09-10T10:00:00Z'),
        buildEvent('3', '2026-09-10T11:00:00Z', '2026-09-10T12:00:00Z'),
        buildEvent('4', '2026-09-10T13:00:00Z', '2026-09-10T14:00:00Z'),
      ];
      const fixture = createFixture(events);
      fixture.componentRef.setInput('viewDate', new Date('2026-09-15T00:00:00Z'));
      fixture.detectChanges();

      const oneEventBadge = inMonthDayCell(fixture, 5).querySelector<HTMLElement>('.cal-day-badge');
      const threeEventBadge = inMonthDayCell(fixture, 10).querySelector<HTMLElement>('.cal-day-badge');
      const noEventBadge = inMonthDayCell(fixture, 6).querySelector<HTMLElement>('.cal-day-badge');

      expect(oneEventBadge).not.toBeNull();
      expect(threeEventBadge).not.toBeNull();
      expect(noEventBadge).toBeNull();

      // Real digit text is still present in the DOM (there's no
      // `cellTemplate` override to omit it, see calendar-board.scss for
      // why), but visually collapsed to a fixed-size, count-less dot:
      // this is what the two non-empty days must render identically.
      const oneStyle = getComputedStyle(oneEventBadge as HTMLElement);
      const threeStyle = getComputedStyle(threeEventBadge as HTMLElement);
      expect(oneStyle.fontSize).toBe('0px');
      expect(threeStyle.fontSize).toBe('0px');
      expect(oneStyle.width).toBe(threeStyle.width);
      expect(oneStyle.height).toBe(threeStyle.height);
      expect(oneStyle.backgroundColor).toBe(threeStyle.backgroundColor);
      expect(oneStyle.borderRadius).toBe(threeStyle.borderRadius);
    });
  });

  describe('onEventTimesChanged()', () => {
    function getHandler(fixture: ComponentFixture<CalendarBoard>) {
      return fixture.componentInstance as unknown as {
        onEventTimesChanged(change: {
          type: string;
          event: { meta: CalendarEvent };
          newStart: Date;
          newEnd?: Date;
        }): void;
      };
    }

    it('emits {id, start, end} using newEnd when the change provides one', () => {
      const fixture = createFixture();
      const original = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      const emitted: CalendarBoardReschedule[] = [];
      fixture.componentInstance.eventReschedule.subscribe((change) => emitted.push(change));

      getHandler(fixture).onEventTimesChanged({
        type: 'drag',
        event: { meta: original },
        newStart: new Date('2026-09-02T09:00:00Z'),
        newEnd: new Date('2026-09-02T11:00:00Z'),
      });

      expect(emitted).toEqual([
        { id: '1', start: new Date('2026-09-02T09:00:00Z'), end: new Date('2026-09-02T11:00:00Z') },
      ]);
    });

    it('falls back to the original event end when the change has no newEnd', () => {
      const fixture = createFixture();
      const original = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      const emitted: CalendarBoardReschedule[] = [];
      fixture.componentInstance.eventReschedule.subscribe((change) => emitted.push(change));

      getHandler(fixture).onEventTimesChanged({
        type: 'drag',
        event: { meta: original },
        newStart: new Date('2026-09-02T09:00:00Z'),
      });

      expect(emitted).toEqual([{ id: '1', start: new Date('2026-09-02T09:00:00Z'), end: original.end }]);
    });
  });
});
