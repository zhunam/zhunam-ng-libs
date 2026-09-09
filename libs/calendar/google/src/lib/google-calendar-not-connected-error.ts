/**
 * Thrown by any `GoogleCalendarConnector` method that talks to the real
 * Google Calendar API (e.g. `listEvents()`) when called while
 * `isConnected()` is `false`. A distinct type from `GoogleApiError`
 * deliberately: this fires before any HTTP request is even made, it's
 * not a failed response from Google, and reusing `CalendarValidationError`
 * from the core would blur that error's own documented meaning (an
 * invalid `CalendarEvent`, not a connector used out of order).
 */
export class GoogleCalendarNotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleCalendarNotConnectedError';
  }
}
