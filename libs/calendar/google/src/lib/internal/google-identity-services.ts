/**
 * Minimal ambient typings for the real Google Identity Services (GIS)
 * OAuth2 token client, hand-written against Google's own official
 * reference (developers.google.com/identity/oauth2/web/reference/js-reference),
 * not the `@types/google.accounts` community package: adding that
 * package would pull an unofficial (non-Google-maintained) dependency
 * into every consumer's build for a handful of type declarations this
 * library can own instead. Covers only the subset `GoogleCalendarConnector`
 * actually calls; extend as later tasks need more of the real surface.
 *
 * Declared via `declare global` inside a real module (this file has its
 * own `export {}`) rather than as a bare ambient script file: ng-packagr's
 * declaration bundler resolves imports by following the module graph, a
 * script-mode `.d.ts` with no import/export of its own (the more common
 * ambient-typings style) isn't reachable that way and broke the
 * `@zhunam/calendar/google` entry point's `.d.ts` bundling step, confirmed
 * by hitting that exact failure before switching to this form.
 */
export {};

declare global {
  namespace google.accounts.oauth2 {
    interface TokenResponse {
      access_token: string;
      expires_in: number;
      scope: string;
      token_type: string;
      error?: string;
      error_description?: string;
      error_uri?: string;
    }

    interface ClientConfigError {
      type: 'popup_failed_to_open' | 'popup_closed' | 'unknown';
    }

    interface TokenClientConfig {
      client_id: string;
      scope: string;
      callback: (response: TokenResponse) => void;
      error_callback?: (error: ClientConfigError) => void;
    }

    interface TokenClient {
      requestAccessToken(): void;
    }

    interface RevocationResponse {
      successful: boolean;
      error?: string;
      error_description?: string;
    }

    function initTokenClient(config: TokenClientConfig): TokenClient;
    function revoke(accessToken: string, done: (response: RevocationResponse) => void): void;
  }
}
