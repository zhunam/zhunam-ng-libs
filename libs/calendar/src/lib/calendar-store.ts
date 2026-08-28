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
   * Adds an event to the store.
   * @throws {CalendarValidationError} If `event.end` is before
   * `event.start`, or if an event with the same `id` is already in the
   * store; the existing event is left untouched either way.
   * @example
   * store.addEvent({ id: '1', title: 'Standup', start, end });
   */
  addEvent(event: CalendarEvent): void {
    if (this.eventsSignal().some((existing) => existing.id === event.id)) {
      throw new CalendarValidationError(
        `An event with id "${event.id}" already exists in the store.`,
      );
    }

    this.assertValidRange(event.start, event.end);
    this.eventsSignal.update((events) => [...events, event]);
  }

  /**
   * Merges `changes` into the event matching `id`. A no-op if no event
   * in the store has that `id`.
   * @throws {CalendarValidationError} If applying `changes` would leave
   * `end` before `start`.
   */
  updateEvent(id: string, changes: Partial<CalendarEvent>): void {
    const current = this.eventsSignal().find((event) => event.id === id);
    if (!current) {
      return;
    }

    const updated: CalendarEvent = { ...current, ...changes };
    this.assertValidRange(updated.start, updated.end);
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

  private assertValidRange(start: Date, end: Date): void {
    if (end < start) {
      throw new CalendarValidationError(
        `Event end (${end.toISOString()}) cannot be before start (${start.toISOString()}).`,
      );
    }
  }
}
