import type { GoogleApiErrorResponse } from './google-calendar-api-types';

/**
 * Google's own `error.message` from a non-2xx response body, or a
 * generic fallback when the body isn't valid JSON or doesn't have that
 * shape. Shared by every `GoogleCalendarConnector` method that talks to
 * the real API, so this parsing logic exists once, not once per method.
 */
export async function extractGoogleErrorMessage(response: Response): Promise<string> {
  let message = `Google Calendar API request failed with status ${response.status}.`;
  try {
    const body: GoogleApiErrorResponse = await response.json();
    message = body.error?.message ?? message;
  } catch {
    // Response body wasn't valid JSON; keep the generic message.
  }
  return message;
}
