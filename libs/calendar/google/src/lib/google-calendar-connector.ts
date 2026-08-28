import { NgZone, inject, signal } from '@angular/core';
import './internal/google-identity-services';
import { loadGsiScript } from './internal/load-gsi-script';

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
 * Client-side connector to a user's Google Calendar via Google Identity
 * Services (GIS), the current, Google-recommended replacement for the
 * old `gapi.auth2` library. Authorization only in this first half of the
 * connector: `connect()`/`disconnect()`. Reading/writing actual events
 * (`listEvents`, `createEvent`, etc.) is a separate, later piece built
 * on top of this one.
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
