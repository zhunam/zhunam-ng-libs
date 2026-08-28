/**
 * A single event on a calendar, generic over whatever domain data it
 * carries (an appointment, a task, a reminder, anything). Modeled as a
 * half-open range `[start, end)`: `end` is exclusive, so an event that
 * ends exactly when another begins does not overlap it (see
 * `CalendarStore.eventsInRange()`/`findConflicts()`).
 *
 * `CalendarStore.addEvent()`/`updateEvent()` reject an event whose `end`
 * is before `start` (`CalendarValidationError`); this isn't enforced at
 * the type level, since a TypeScript interface has no runtime presence
 * to check against.
 */
export interface CalendarEvent<T = unknown> {
  /**
   * Unique identifier. The consumer assigns it; `CalendarStore` never
   * generates one.
   */
  id: string;

  /**
   * Display title.
   */
  title: string;

  /**
   * Start of the event, inclusive.
   */
  start: Date;

  /**
   * End of the event, exclusive.
   */
  end: Date;

  /**
   * Whether this is an all-day event, with no meaningful time-of-day
   * component on `start`/`end`.
   * @default false
   */
  allDay?: boolean;

  /**
   * RRULE string (RFC 5545) describing this event's recurrence, e.g.
   * `'FREQ=DAILY;COUNT=5'`. The `RRULE:` prefix is optional, both forms
   * parse identically. This event's own `start` is always used as the
   * rule's `dtstart`, even if the string embeds its own `DTSTART` line,
   * that line is ignored (confirmed against the real `rrule` package).
   *
   * `CalendarStore.eventsInRange()`/`findConflicts()` expand this via
   * `rrule`, one entry per matching occurrence, all sharing this event's
   * `id`. `addEvent()`/`updateEvent()` reject a string that doesn't
   * parse as a real RRULE (`CalendarValidationError`).
   * @example
   * event.recurrence = 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10';
   */
  recurrence?: string;

  /**
   * Arbitrary domain data attached to this event (an appointment record,
   * a task, anything the consumer needs). `CalendarStore` never reads or
   * writes into it.
   */
  data?: T;
}
