/**
 * Shapes confirmed against Google's own Calendar API v3 reference
 * (developers.google.com/calendar/api/v3/reference/events), covering
 * only the fields `mapGoogleEvent()` actually reads.
 */

export interface GoogleEventDateTime {
  /** Present for an all-day event, `yyyy-mm-dd`. */
  date?: string;
  /** Present for a timed event, RFC3339. */
  dateTime?: string;
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
