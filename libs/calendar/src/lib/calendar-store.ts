import { Signal, computed, signal } from '@angular/core';
import { CalendarValidationError } from './errors/calendar-validation-error';
import type { CalendarEvent } from './models/calendar-event';

/**
 * Two events conflict/intersect when their half-open ranges
 * `[aStart, aEnd)`/`[bStart, bEnd)` overlap: an event ending exactly
 * when another begins does not overlap it, `end` is exclusive.
 */
function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Validates an event's own shape: `start`/`end` must be real `Date`
 * instances (not an `Invalid Date`, not a string that merely satisfies
 * the `CalendarEvent` type at compile time but not at runtime), and
 * `end` must not be before `start`. Checked in that order, `start` and
 * `end` are each meaningless to compare until confirmed valid on their
 * own.
 */
function assertValidEvent(event: CalendarEvent): void {
  if (!(event.start instanceof Date) || isNaN(event.start.getTime())) {
    throw new CalendarValidationError(
      `CalendarEvent.start must be a valid Date, received ${String(event.start)}.`,
    );
  }

  if (!(event.end instanceof Date) || isNaN(event.end.getTime())) {
    throw new CalendarValidationError(
      `CalendarEvent.end must be a valid Date, received ${String(event.end)}.`,
    );
  }

  if (event.end < event.start) {
    throw new CalendarValidationError(
      `CalendarEvent.end (${event.end.toISOString()}) cannot be before start (${event.start.toISOString()}).`,
    );
  }
}

/**
 * A copy of `event` safe to store: same `data` reference (the store
 * never introspects or mutates it), but `start`/`end` cloned into new
 * `Date` instances, so a caller mutating the `Date` object it originally
 * passed in (e.g. `event.start.setFullYear(...)`) can never reach back
 * into the store's own state.
 */
function cloneEvent(event: CalendarEvent): CalendarEvent {
  return { ...event, start: new Date(event.start.getTime()), end: new Date(event.end.getTime()) };
}

/**
 * In-memory, reactive store of `CalendarEvent`s. No backend, no
 * persistence: state lives only in this instance, for as long as it's
 * referenced. `/google` (a later, separate entry point) will sync
 * against it rather than replace it.
 *
 * Recurrence is not expanded yet: `eventsInRange()`/`findConflicts()`
 * treat every event, recurring or not, as a single occurrence at its
 * literal `start`/`end`. Real `rrule` expansion is a later task
 * (ROADMAP.md); until then, a `CalendarEvent.recurrence` is stored but
 * has no effect on queries.
 */
export class CalendarStore {
  private readonly eventsSignal = signal<CalendarEvent[]>([]);

  /**
   * Every event currently in the store, in insertion order.
   */
  readonly events = this.eventsSignal.asReadonly();

  /**
   * Adds an event to the store. Stores a copy, not the object passed in:
   * mutating the original afterwards (including its `start`/`end` `Date`
   * objects) never affects what's in the store.
   * @throws {CalendarValidationError} If `event.start`/`event.end` isn't
   * a valid `Date`, if `event.end` is before `event.start`, or if an
   * event with the same `id` is already in the store. Checked in that
   * order: a structurally invalid event is rejected before it's even
   * compared against existing ids.
   * @example
   * store.addEvent({ id: '1', title: 'Standup', start, end });
   */
  addEvent(event: CalendarEvent): void {
    assertValidEvent(event);

    if (this.eventsSignal().some((existing) => existing.id === event.id)) {
      throw new CalendarValidationError(
        `An event with id "${event.id}" already exists in the store.`,
      );
    }

    this.eventsSignal.update((events) => [...events, cloneEvent(event)]);
  }

  /**
   * Merges `changes` into the event matching `id` and validates the
   * resulting event as a whole, not `changes` in isolation (`changes`
   * may carry only one of `start`/`end`, only the merged result is
   * meaningful to check). A no-op if no event in the store has that
   * `id`. Stores a copy of the merged result, same as `addEvent()`.
   * @throws {CalendarValidationError} If the merged event has an invalid
   * `start`/`end`, or ends up with `end` before `start`. The event
   * already in the store is left untouched, never partially updated.
   */
  updateEvent(id: string, changes: Partial<CalendarEvent>): void {
    const current = this.eventsSignal().find((event) => event.id === id);
    if (!current) {
      return;
    }

    const merged: CalendarEvent = { ...current, ...changes };
    assertValidEvent(merged);

    const updated = cloneEvent(merged);
    this.eventsSignal.update((events) =>
      events.map((event) => (event.id === id ? updated : event)),
    );
  }

  /**
   * Removes the event matching `id`. A no-op if no event in the store
   * has that `id`.
   */
  deleteEvent(id: string): void {
    this.eventsSignal.update((events) => events.filter((event) => event.id !== id));
  }

  /**
   * Events whose range intersects `[start, end)`. Reactive: re-evaluates
   * whenever `events()` changes.
   */
  eventsInRange(start: Date, end: Date): Signal<CalendarEvent[]> {
    return computed(() =>
      this.eventsSignal().filter((event) => rangesOverlap(event.start, event.end, start, end)),
    );
  }

  /**
   * Other events in the store whose range overlaps `event`'s. Excludes
   * `event` itself (matched by `id`), so checking an already-stored
   * event against the store never flags it as conflicting with itself.
   * Reactive: re-evaluates whenever `events()` changes.
   */
  findConflicts(event: CalendarEvent): Signal<CalendarEvent[]> {
    return computed(() =>
      this.eventsSignal().filter(
        (other) =>
          other.id !== event.id && rangesOverlap(other.start, other.end, event.start, event.end),
      ),
    );
  }
}
