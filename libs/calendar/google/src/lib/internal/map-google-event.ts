import type { CalendarEvent } from '@zhunam/calendar';
import { GoogleApiError } from '../google-api-error';
import type { GoogleCalendarEvent, GoogleEventDateTime } from './google-calendar-api-types';

function parseGoogleDateTime(dt: GoogleEventDateTime | undefined): { date: Date; allDay: boolean } {
  if (dt?.date) {
    // Date-only, not `${dt.date}T00:00:00`: a bare `yyyy-mm-dd` string
    // parses as UTC midnight, confirmed empirically. Appending a
    // timezone-less time component instead makes `Date` parse it as
    // LOCAL midnight (a real, confirmed difference between the two
    // forms), which would silently shift an all-day event onto the
    // wrong calendar day depending on the runtime's local timezone.
    return { date: new Date(dt.date), allDay: true };
  }

  if (dt?.dateTime) {
    return { date: new Date(dt.dateTime), allDay: false };
  }

  throw new GoogleApiError(0, 'Google Calendar event is missing both start/end date and dateTime.');
}

/**
 * First RRULE line in `recurrence`, prefix included (`rrulestr()`
 * accepts it either way, confirmed in an earlier task). Any EXRULE/
 * RDATE/EXDATE line, or a second RRULE line, is ignored: an event with
 * multiple rules or explicit exceptions edited directly in Google
 * Calendar isn't represented with full fidelity in v1, only its first
 * RRULE survives the round trip. Undefined if `recurrence` is absent or
 * has no RRULE line at all.
 */
function extractRRule(recurrence: string[] | undefined): string | undefined {
  return recurrence?.find((line) => line.toUpperCase().startsWith('RRULE:'));
}

/**
 * Maps a real Google Calendar API `Event` resource to this library's
 * own `CalendarEvent`. `data` is always left `undefined`: it's
 * consumer-defined domain data, Google's API has no equivalent to carry
 * over.
 */
export function mapGoogleEvent(event: GoogleCalendarEvent): CalendarEvent {
  const start = parseGoogleDateTime(event.start);
  const end = parseGoogleDateTime(event.end);
  const recurrence = extractRRule(event.recurrence);

  return {
    id: event.id,
    title: event.summary ?? '',
    start: start.date,
    end: end.date,
    allDay: start.allDay,
    ...(recurrence !== undefined ? { recurrence } : {}),
  };
}
