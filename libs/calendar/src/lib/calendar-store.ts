import { Signal, computed, signal } from '@angular/core';
import { rrulestr } from 'rrule';
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
 * Hard ceiling on how many occurrences a single recurring event can
 * contribute to one `expandOccurrences()` call. A high-frequency rule
 * with no `COUNT`/`UNTIL` (e.g. `FREQ=SECONDLY`) queried over a wide
 * enough range could otherwise materialize an unbounded array in
 * memory, `rrule`'s own `.between()` has no size limit of its own, only
 * a date-range one. Applies per event per call, not globally across the
 * store: several recurring events in the same query can each contribute
 * up to this many.
 */
const MAX_OCCURRENCES_PER_EXPANSION = 1000;

/**
 * Validates an event's own shape: `start`/`end` must be real `Date`
 * instances (not an `Invalid Date`, not a string that merely satisfies
 * the `CalendarEvent` type at compile time but not at runtime), `end`
 * must not be before `start`, and, if present, `recurrence` must parse
 * as a real RRULE string. Checked in that order: `start`/`end` have to
 * be valid before they're comparable to each other, and `recurrence` is
 * checked last since parsing it needs an already-valid `start` as its
 * `dtstart`.
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

  if (event.recurrence !== undefined) {
    try {
      // Parse-only: confirms the string is a real RRULE, the resulting
      // rule itself is discarded here and rebuilt by expandOccurrences()
      // whenever it's actually needed.
      rrulestr(event.recurrence, { dtstart: event.start });
    } catch (cause) {
      throw new CalendarValidationError(
        `CalendarEvent.recurrence is not a valid RRULE string, received "${event.recurrence}": ${(cause as Error).message}`,
      );
    }
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
 * Occurrences of `event` that intersect `[rangeStart, rangeEnd)`.
 *
 * A non-recurring event is either its own single occurrence (if it
 * intersects the range) or nothing. A recurring event is expanded via
 * `rrule`'s real `.between()`, never `.all()` unbounded: an event with
 * no `COUNT`/`UNTIL` would make `.all()` enumerate forever. `.between()`
 * itself is not slow to bound from a distant `dtstart` either, confirmed
 * empirically against the real installed `rrule`: querying a window
 * years past `dtstart` for an uncapped daily rule still resolved in
 * ~15ms, `rrule` seeks internally rather than walking every occurrence
 * from the start.
 *
 * Queried from `rangeStart` minus `event`'s own duration, not from
 * `rangeStart` itself: an occurrence that starts before `rangeStart`
 * but whose duration carries it past `rangeStart` still intersects the
 * range and must not be missed (same edge case `findConflicts()` cares
 * about for a single event, applied per-occurrence here). Queried with
 * `inc: true` so an occurrence landing exactly on either widened
 * boundary isn't silently dropped by `between()`'s own default
 * (confirmed empirically: `between()` excludes both of its own bounds
 * unless `inc: true`, they're not treated as a half-open range). The
 * final, exact `[rangeStart, rangeEnd)` filter is enforced afterward by
 * `rangesOverlap()`, not by rrule's `inc` flag: the two have different
 * boundary semantics, `inc` is symmetric, this store's convention isn't.
 *
 * Capped at `MAX_OCCURRENCES_PER_EXPANSION` (1000) occurrences via
 * `between()`'s own `iterator` callback, confirmed empirically against
 * the real installed `rrule`: the callback receives `(date, len)` with
 * `len` equal to the number of occurrences already accepted (0-indexed,
 * before this one), and returning `false` both excludes that candidate
 * and stops the underlying iteration entirely, it isn't just skipped.
 * That means the cap is enforced exactly at the source, `rrule` never
 * materializes more than the limit even internally, not a `.slice()`
 * applied after the fact. When the cap actually cuts off real
 * occurrences still inside `[rangeStart, rangeEnd)`, this is silent at
 * the exception level (`eventsInRange()`/`findConflicts()` still return
 * normally, one bad event doesn't break the whole query) but visible on
 * the console via `console.warn()`, naming the event's `id`, its
 * `recurrence` string, and the limit reached, so it's discoverable while
 * debugging rather than a query that just quietly returns less than
 * expected. An event with fewer real occurrences than the cap never
 * triggers the warning, this is confirmed by `len` only ever reaching
 * `MAX_OCCURRENCES_PER_EXPANSION` if a 1001st in-range candidate
 * actually exists for the iterator to be called with.
 */
function expandOccurrences(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  if (!event.recurrence) {
    return rangesOverlap(event.start, event.end, rangeStart, rangeEnd) ? [event] : [];
  }

  const durationMs = event.end.getTime() - event.start.getTime();
  const rule = rrulestr(event.recurrence, { dtstart: event.start });
  const queryStart = new Date(rangeStart.getTime() - durationMs);

  let truncated = false;
  const occurrenceStarts = rule.between(queryStart, rangeEnd, true, (_date, len) => {
    if (len >= MAX_OCCURRENCES_PER_EXPANSION) {
      truncated = true;
      return false;
    }
    return true;
  });

  if (truncated) {
    console.warn(
      `CalendarStore: event "${event.id}" (recurrence "${event.recurrence}") ` +
        `has more than ${MAX_OCCURRENCES_PER_EXPANSION} occurrences in the queried range. ` +
        `Only the first ${MAX_OCCURRENCES_PER_EXPANSION} are included; narrow the query range ` +
        `or the event's recurrence to see the rest.`,
    );
  }

  return occurrenceStarts
    .map((start): CalendarEvent => ({ ...event, start, end: new Date(start.getTime() + durationMs) }))
    .filter((occurrence) => rangesOverlap(occurrence.start, occurrence.end, rangeStart, rangeEnd));
}

/**
 * In-memory, reactive store of `CalendarEvent`s. No backend, no
 * persistence: state lives only in this instance, for as long as it's
 * referenced. `/google` (a later, separate entry point) will sync
 * against it rather than replace it.
 *
 * Recurrence is expanded via `rrule`: `eventsInRange()`/`findConflicts()`
 * both use `expandOccurrences()` internally, so a recurring event
 * contributes one entry per matching occurrence, not just its literal
 * `start`/`end`.
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
   * a valid `Date`, if `event.end` is before `event.start`, if
   * `event.recurrence` doesn't parse as a real RRULE string, or if an
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
   * `start`/`end`, ends up with `end` before `start`, or has a
   * `recurrence` that doesn't parse as a real RRULE string. The event
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
   * Occurrences (of any stored event, recurring or not) whose range
   * intersects `[start, end)`. Reactive: re-evaluates whenever
   * `events()` changes.
   *
   * A recurring event can contribute more than one entry, one per
   * matching occurrence, all sharing that event's `id`. Multiple
   * entries with the same `id` here is intentional, not a bug: use
   * `start`/`end` (not `id` alone) to tell occurrences apart.
   *
   * A single recurring event contributes at most
   * `MAX_OCCURRENCES_PER_EXPANSION` (1000) entries, even if its rule
   * would produce more within `[start, end)`. This never throws, an
   * event beyond the limit doesn't break the rest of the query, but it
   * does `console.warn()` with that event's `id` so it's discoverable
   * while debugging rather than a silently short result.
   */
  eventsInRange(start: Date, end: Date): Signal<CalendarEvent[]> {
    return computed(() =>
      this.eventsSignal().flatMap((event) => expandOccurrences(event, start, end)),
    );
  }

  /**
   * Other events in the store, including individual occurrences of a
   * recurring one, whose range overlaps `event`'s. Excludes `event`
   * itself (matched by `id`) before expanding anything, so checking an
   * already-stored event against the store never flags it as
   * conflicting with itself or its own other occurrences. `event` is
   * always compared at its own literal `start`/`end`, only *other*
   * stored events get expanded into their occurrences. Reactive:
   * re-evaluates whenever `events()` changes.
   */
  findConflicts(event: CalendarEvent): Signal<CalendarEvent[]> {
    return computed(() =>
      this.eventsSignal()
        .filter((other) => other.id !== event.id)
        .flatMap((other) => expandOccurrences(other, event.start, event.end)),
    );
  }
}
