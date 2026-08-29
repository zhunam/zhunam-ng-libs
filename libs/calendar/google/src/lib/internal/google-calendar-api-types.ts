/**
 * Shapes confirmed against Google's own Calendar API v3 reference
 * (developers.google.com/calendar/api/v3/reference/events), covering
 * only the fields `mapGoogleEvent()`/`mapToGoogleEvent()` actually
 * read or write.
 */

export interface GoogleEventDateTime {
  /** Present for an all-day event, `yyyy-mm-dd`. */
  date?: string;
  /** Present for a timed event, RFC3339. */
  dateTime?: string;
  /**
   * IANA zone name, e.g. `"America/Bogota"`. Display-only per Google's
   * own reference, doesn't change which instant `dateTime` represents
   * (that's already fully determined by `dateTime`'s own offset/`Z`).
   * Only ever written by `mapToGoogleEvent()`, `mapGoogleEvent()` never
   * reads it back.
   */
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  /**
   * Raw RFC5545 lines (RRULE/EXRULE/RDATE/EXDATE), each including its
   * own property prefix (e.g. `"RRULE:FREQ=DAILY"`). Absent for a
   * single (non-recurring) event or for an individual instance of a
   * recurring one.
   */
  recurrence?: string[];
}

export interface GoogleCalendarEventsListResponse {
  items?: GoogleCalendarEvent[];
  /**
   * Present when there's another page of results to fetch; absent on
   * the last page. Confirmed against Google's own reference.
   */
  nextPageToken?: string;
}

/**
 * Google's own error envelope shape for a non-2xx response, confirmed
 * against developers.google.com/calendar/api/guides/errors.
 */
export interface GoogleApiErrorResponse {
  error?: {
    message?: string;
  };
}
