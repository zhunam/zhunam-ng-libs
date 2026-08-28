import { NgZone, inject, signal } from '@angular/core';
import type { CalendarEvent } from '@zhunam/calendar';
import { GoogleApiError } from './google-api-error';
import { GoogleCalendarNotConnectedError } from './google-calendar-not-connected-error';
import './internal/google-identity-services';
import type { GoogleApiErrorResponse, GoogleCalendarEventsListResponse } from './internal/google-calendar-api-types';
import { loadGsiScript } from './internal/load-gsi-script';
import { mapGoogleEvent } from './internal/map-google-event';

/**
 * Scope requested for authorization: read/write access to events on the
 * user's calendars, without the broader `calendar` scope's access to
 * calendar administration (sharing, deletion, calendar list management).
 * Confirmed against Google's own Calendar API scope reference; Google's
 * own guidance favors the narrowest scope that covers what's needed,
 * this connector never requests more.
 */
const CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/**
 * Confirmed against Google's own `events.list` reference: "By default
 * the value is 250 events. The page size can never be larger than 2500
 * events." Requested explicitly on every page (`maxResults` query
 * param) instead of left to that default: the total-event ceiling
 * `MAX_PAGES_PER_FETCH * MAX_RESULTS_PER_PAGE` below is then a real
 * guarantee by construction, not an assumption that only keeps holding
 * as long as Google's own default doesn't change.
 */
const MAX_RESULTS_PER_PAGE = 250;

/**
 * Hard ceiling on how many pages `listEvents()` follows via
 * `nextPageToken`. At `MAX_RESULTS_PER_PAGE` (250) each, 4 pages caps a
 * single `listEvents()` call at 1000 events, the same generous ceiling
 * `CalendarStore`'s own `MAX_OCCURRENCES_PER_EXPANSION` already uses
 * for a single recurring event's expansion, so this connector doesn't
 * introduce a different notion of "generous enough" from the rest of
 * the library. Reached only by an extremely loaded calendar in the
 * queried range; see `listEvents()`'s own JSDoc for what happens then.
 */
const MAX_PAGES_PER_FETCH = 4;

/**
 * Client-side connector to a user's Google Calendar via Google Identity
 * Services (GIS), the current, Google-recommended replacement for the
 * old `gapi.auth2` library, plus read access to events via the real
 * Calendar API v3 REST endpoint (`listEvents()`). Writing events
 * (`createEvent`, `updateEvent`, `deleteEvent`) is a separate, later
 * piece built on top of this one.
 *
 * 100% client-side, no backend of this library's own: confirmed against
 * Google's official docs, the browser OAuth2 token flow this connector
 * uses never involves a client secret, only a public Client ID (see
 * `connect()`'s JSDoc for why that's safe to have in the bundle).
 *
 * **Security invariant, deliberate, not an oversight:** the access token
 * is held in a real ECMAScript private field (`#accessToken`, not
 * TypeScript's `private` keyword) and never exposed through any public
 * getter, sync or async. Every method this connector (and its future
 * CRUD half) exposes does something *with* the token internally, none
 * of them ever hand it back out. This mirrors `getIdToken()` in
 * `@zhunam/auth`'s own core: a token is a credential, not a value a
 * consumer should be able to read out and pass around unsupervised.
 *
 * `#accessToken` specifically, not `private accessToken`: TypeScript's
 * `private` is a compile-time-only annotation, the field is still a
 * perfectly ordinary, enumerable own property at runtime. Confirmed the
 * hard way, by a test in this connector's own spec that initially used
 * `private` and failed: `JSON.stringify(connector)` (and `Object.keys()`)
 * genuinely included the live token. A real `#` private field isn't
 * enumerable and isn't visible to either of those, or to
 * `Reflect.ownKeys()`, confirmed the same way once switched.
 *
 * Instantiate within an Angular injection context (this class reads
 * `NgZone` via `inject()` at field-initializer time, the same pattern
 * `@zhunam/pdf-generator`'s `PdfPreview` already uses), e.g. from a
 * component's or another service's constructor.
 */
export class GoogleCalendarConnector {
  private readonly ngZone = inject(NgZone);
  private readonly connectedSignal = signal(false);

  /**
   * The token currently authorizing calls to the Google Calendar API,
   * `null` when not connected. Deliberately a real `#private` field, see
   * the class-level security invariant above: nothing outside this class
   * ever reads it, and no reflection API can read it from the outside.
   */
  #accessToken: string | null = null;

  /**
   * Whether this connector currently holds a valid access token.
   */
  readonly isConnected = this.connectedSignal.asReadonly();

  /**
   * Requests authorization against the user's Google Calendar, showing
   * Google's own consent screen (Google Identity Services manages this
   * UI entirely, not this library). Resolves once an access token is
   * granted; rejects if the user denies consent, the popup fails to
   * open/is closed, or the Google Identity Services script itself fails
   * to load.
   *
   * `clientId` is the OAuth 2.0 Client ID for a **browser (public)**
   * application, from Google Cloud Console. It is **not** a secret, the
   * same way a Firebase project's public config isn't: it identifies
   * your app to Google, it doesn't authenticate as it. Safe to compile
   * into this app's bundle and ship to the browser; never pair it with
   * a client secret in frontend code (this connector's flow has no
   * secret to begin with, confirmed against Google's own docs for the
   * browser OAuth2 token model).
   *
   * No silent, no-interaction renewal is offered here in v1. Google
   * Identity Services does have a `prompt: 'none'` option that can skip
   * the consent screen when the user already has an active, previously
   * consented session, but Google's own docs don't characterize it as
   * reliable, and Google's own guidance for an expired token is to call
   * `requestAccessToken()` again "from a user-driven event such as a
   * button press," not to lean on a background silent flow. Promising
   * silent renewal here would be asserting more than what's actually
   * documented; a later task can revisit this once there's a concrete
   * reason to.
   * @throws {Error} If the GIS script fails to load, or if authorization
   * fails or is denied (message includes Google's own error code).
   */
  async connect(clientId: string): Promise<void> {
    await loadGsiScript();

    return new Promise<void>((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: CALENDAR_EVENTS_SCOPE,
        callback: (response) => {
          // Confirmed by the same reasoning already validated for
          // Firebase/Supabase in @zhunam/auth (see firebase-auth.service.ts):
          // this callback is invoked from Google's own script, via its
          // own popup/postMessage machinery, not through any Angular API,
          // so it isn't guaranteed to run inside Angular's execution
          // context. Wrapping in ngZone.run() couldn't independently be
          // reproduced with a live token exchange here (that needs a real,
          // registered Google Cloud Client ID and real user interaction,
          // neither available in this environment); applied defensively
          // by the same architectural reasoning, and harmless if it turns
          // out to already have been unnecessary, this workspace runs
          // zoneless (no `zone.js` installed), so without a real zone
          // present `NgZone` falls back to Angular's own no-op
          // implementation and `.run()` is just a direct call.
          this.ngZone.run(() => {
            if (response.error) {
              this.clearAuthorization();
              reject(
                new Error(
                  `Google Calendar authorization failed: ${response.error}` +
                    (response.error_description ? ` (${response.error_description})` : ''),
                ),
              );
              return;
            }

            this.#accessToken = response.access_token;
            this.connectedSignal.set(true);
            resolve();
          });
        },
        error_callback: (error) => {
          this.ngZone.run(() => {
            this.clearAuthorization();
            reject(new Error(`Google Calendar authorization popup failed: ${error.type}`));
          });
        },
      });

      tokenClient.requestAccessToken();
    });
  }

  /**
   * Events on the user's primary calendar whose range intersects
   * `range` (same half-open `[start, end)` convention as `CalendarStore`).
   * `range.start`/`range.end` become the real API's `timeMin`/`timeMax`
   * query params directly: `timeMin` is Google's own exclusive lower
   * bound on an event's *end* time and `timeMax` its exclusive upper
   * bound on an event's *start* time, which is exactly this same
   * half-open overlap test from the other direction, confirmed against
   * Google's own reference, not a naive "start/end both inside range"
   * read of those two names.
   *
   * A recurring event comes back from Google as a single resource with
   * a `recurrence` array (`singleEvents` is deliberately left at its
   * real default of `false`, never requested as `true`): only that
   * event's *first* RRULE line is kept, any EXRULE/RDATE/EXDATE line or
   * additional RRULE is dropped. An event edited directly in Google
   * Calendar with multiple rules or explicit exceptions isn't
   * represented with full fidelity in v1; instance expansion itself
   * still happens correctly afterward via `CalendarStore`'s own `rrule`
   * integration once the mapped event is added to a store.
   *
   * Follows `nextPageToken` automatically, accumulating events across
   * pages, until either there's no further page (the normal case for
   * most UI-driven queries) or `MAX_PAGES_PER_FETCH` (4) pages have been
   * fetched, whichever comes first. Hitting that limit never throws: an
   * extremely loaded calendar in `range` shouldn't make `listEvents()`
   * fail outright, it returns everything accumulated up to that point
   * instead, and `console.warn()`s with the queried range and the total
   * returned, so an incomplete result is discoverable while debugging
   * rather than silently short. See `MAX_PAGES_PER_FETCH`'s own JSDoc
   * for why 4 (at 250 events per page) is the chosen ceiling.
   * @throws {GoogleCalendarNotConnectedError} If `isConnected()` is
   * `false`; never attempts a fetch in that case.
   * @throws {GoogleApiError} If Google responds with a non-2xx status on
   * any page. A `401` additionally clears this connector's authorization
   * (`isConnected()` becomes `false`), since it means the token expired
   * or was revoked; any other status leaves `isConnected()` unchanged,
   * a `500` doesn't mean the user needs to reauthorize.
   */
  async listEvents(range: { start: Date; end: Date }): Promise<CalendarEvent[]> {
    if (!this.connectedSignal()) {
      throw new GoogleCalendarNotConnectedError(
        'GoogleCalendarConnector.listEvents() was called before connect() succeeded.',
      );
    }

    const events: CalendarEvent[] = [];
    let pageToken: string | undefined;
    let pagesFetched = 0;

    do {
      const params = new URLSearchParams({
        timeMin: range.start.toISOString(),
        timeMax: range.end.toISOString(),
        maxResults: String(MAX_RESULTS_PER_PAGE),
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        // isConnected() true guarantees #accessToken is set, they're only
        // ever changed together (connect()'s success path, clearAuthorization()).
        { headers: { Authorization: `Bearer ${this.#accessToken}` } },
      );

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuthorization();
        }

        let message = `Google Calendar API request failed with status ${response.status}.`;
        try {
          const body: GoogleApiErrorResponse = await response.json();
          message = body.error?.message ?? message;
        } catch {
          // Response body wasn't valid JSON; keep the generic message.
        }

        throw new GoogleApiError(response.status, message);
      }

      const body: GoogleCalendarEventsListResponse = await response.json();
      events.push(...(body.items ?? []).map(mapGoogleEvent));
      pageToken = body.nextPageToken;
      pagesFetched += 1;

      if (pageToken && pagesFetched >= MAX_PAGES_PER_FETCH) {
        console.warn(
          `GoogleCalendarConnector.listEvents(): reached the ${MAX_PAGES_PER_FETCH}-page limit for range ` +
            `[${range.start.toISOString()}, ${range.end.toISOString()}). Returning ${events.length} events ` +
            'accumulated so far; more may exist. Narrow the queried range to see the rest.',
        );
        break;
      }
    } while (pageToken);

    return events;
  }

  /**
   * Clears this connector's authorization and best-effort revokes the
   * token with Google (`google.accounts.oauth2.revoke()`), so the user's
   * consent for `CALENDAR_EVENTS_SCOPE` is actually withdrawn, not just
   * forgotten locally. `isConnected` becomes `false` synchronously;
   * revocation itself happens in the background and never rejects this
   * method, a revoke failure is only `console.warn()`-ed, since the
   * connector's own state is already correctly cleared either way.
   */
  disconnect(): void {
    const token = this.#accessToken;
    this.clearAuthorization();

    if (token) {
      google.accounts.oauth2.revoke(token, (response) => {
        if (!response.successful) {
          console.warn(
            `GoogleCalendarConnector: failed to revoke the access token on disconnect (${response.error ?? 'unknown error'}).`,
          );
        }
      });
    }
  }

  /**
   * Drops the current token and flips `isConnected` to `false`, without
   * revoking anything server-side (unlike `disconnect()`). Internal only,
   * not part of the public API: this is the hook the future CRUD half of
   * this connector will call the moment a Calendar API response reveals
   * the token is no longer valid (expired, revoked elsewhere), so
   * `isConnected` reflects reality without this connector having asked
   * Google to revoke anything itself.
   */
  private clearAuthorization(): void {
    this.#accessToken = null;
    this.connectedSignal.set(false);
  }
}
