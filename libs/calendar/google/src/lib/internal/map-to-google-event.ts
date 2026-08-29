import type { CalendarEvent } from '@zhunam/calendar';
import type { GoogleCalendarEvent, GoogleEventDateTime } from './google-calendar-api-types';

/**
 * `date`/`dateTime` for a Google `Event.start`/`Event.end`, from a
 * `CalendarEvent`'s own `Date`.
 *
 * All-day (`date`, `yyyy-mm-dd`): `date.toISOString().slice(0, 10)`, not
 * a locale/local-timezone-based formatter. This is the exact inverse of
 * how `mapGoogleEvent()` reads an all-day date back in
 * (`new Date(dt.date)`, which parses a bare `yyyy-mm-dd` as UTC
 * midnight): `toISOString()` always renders in UTC too, so slicing its
 * first 10 characters recovers the identical calendar day regardless of
 * the runtime's local timezone. Confirmed with a round-trip test
 * (Google -> `CalendarEvent` -> Google reproduces the exact same date
 * string). This assumes `start`/`end` on an all-day `CalendarEvent`
 * already represent UTC midnight of the intended day, the same
 * convention `mapGoogleEvent()` produces; a `CalendarEvent` built by a
 * consumer from scratch with a *local*-midnight `Date` for an all-day
 * event would round-trip to the wrong calendar day here, this isn't
 * validated or corrected, only documented.
 *
 * Timed (`dateTime`): always sent as a real instant (`date.toISOString()`),
 * with the runtime's own IANA zone name attached as `timeZone`
 * (`Intl.DateTimeFormat().resolvedOptions().timeZone`) for Google's
 * display purposes only, it doesn't change which instant `dateTime`
 * itself represents (an RFC3339 string with an explicit offset/`Z`
 * already fully determines that).
 */
function toGoogleDateTime(date: Date, allDay: boolean | undefined): GoogleEventDateTime {
  if (allDay) {
    return { date: date.toISOString().slice(0, 10) };
  }

  return { dateTime: date.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
}

/**
 * A single RRULE line for Google's `Event.recurrence`, always with
 * exactly one `RRULE:` prefix. `CalendarEvent.recurrence` accepts either
 * form (bare or already prefixed, e.g. a value round-tripped from
 * `mapGoogleEvent()` already carries the prefix): naively concatenating
 * `RRULE:` onto an already-prefixed value would double it up
 * (`RRULE:RRULE:...`), breaking `rrulestr()`. Strips any existing prefix
 * first, then adds exactly one, so both input forms produce the same
 * correct line.
 */
function toGoogleRRuleLine(recurrence: string): string {
  return `RRULE:${recurrence.replace(/^RRULE:/i, '')}`;
}

/**
 * Maps this library's own `CalendarEvent` fields to a (partial) Google
 * Calendar API `Event` resource body, for `createEvent()`/`updateEvent()`.
 * `id` is never included: Google always assigns/owns it (confirmed
 * against the real base32hex id format in an earlier task), including
 * one in a request body would be ignored at best. `data` is never
 * included either: it's this library's own consumer-defined metadata,
 * Google's `Event` schema has no equivalent field for it, callers
 * reattach it to the mapped response themselves from the original input.
 */
export function mapToGoogleEvent(
  event: Partial<Pick<CalendarEvent, 'title' | 'start' | 'end' | 'allDay' | 'recurrence'>>,
): Partial<GoogleCalendarEvent> {
  const body: Partial<GoogleCalendarEvent> = {};

  if (event.title !== undefined) {
    body.summary = event.title;
  }

  if (event.start !== undefined) {
    body.start = toGoogleDateTime(event.start, event.allDay);
  }

  if (event.end !== undefined) {
    body.end = toGoogleDateTime(event.end, event.allDay);
  }

  if (event.recurrence !== undefined) {
    body.recurrence = [toGoogleRRuleLine(event.recurrence)];
  }

  return body;
}
