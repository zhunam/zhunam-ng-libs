/**
 * Thrown when a request to the real Google Calendar REST API resolves
 * with a non-2xx status. `status` is the real HTTP status code Google
 * responded with; `message` is Google's own `error.message` from the
 * response body when present, a generic fallback otherwise (an error
 * response that doesn't parse as JSON, or doesn't have that shape).
 */
export class GoogleApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GoogleApiError';
  }
}
