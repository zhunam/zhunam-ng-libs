import { computed, NgZone, signal } from '@angular/core';
import {
  AuthRetryableFetchError,
  AuthSessionMissingError,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import {
  AUTH_ERROR_CODES,
  AuthService,
  AuthServiceError,
  AuthSignInOptions,
  AuthSignUpProfile,
  AuthUser,
} from '@zhunam/auth';

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    // Supabase has no first-class "verified" flag — email_confirmed_at is
    // only set once the user confirms, so its presence *is* the signal.
    emailVerified: Boolean(user.email_confirmed_at),
    // Supabase has no first-class displayName field either: unlike
    // Firebase's User.displayName, any name lives in the free-form
    // user_metadata object, under whatever key the app chose when it
    // called signUp()/updateUser() (commonly "full_name" or "name", e.g.
    // via an OAuth provider). We check both common conventions and fall
    // back to null rather than guessing further.
    displayName: readMetadataString(user.user_metadata, 'full_name') ?? readMetadataString(user.user_metadata, 'name'),
  };
}

function readMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' ? value : null;
}

// Every Supabase auth call in this service maps its `{ error }` result
// through this, so the consumer only ever sees AuthServiceError with a
// normalized code, never Supabase's own error shape.
function mapSupabaseError(error: unknown): AuthServiceError {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof AuthRetryableFetchError) {
    return new AuthServiceError(AUTH_ERROR_CODES.networkRequestFailed, message, error);
  }
  // Only ever reachable from completePasswordReset()'s updateUser() call:
  // it needs an active recovery session, and this is what Supabase throws
  // when one isn't present (e.g. the reset link expired or was already used).
  if (error instanceof AuthSessionMissingError) {
    return new AuthServiceError(AUTH_ERROR_CODES.invalidActionCode, message, error);
  }

  const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : undefined;
  switch (code) {
    case 'invalid_credentials':
      return new AuthServiceError(AUTH_ERROR_CODES.invalidCredential, message, error);
    case 'user_already_exists':
    case 'email_exists':
      return new AuthServiceError(AUTH_ERROR_CODES.emailAlreadyInUse, message, error);
    case 'weak_password':
      return new AuthServiceError(AUTH_ERROR_CODES.weakPassword, message, error);
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return new AuthServiceError(AUTH_ERROR_CODES.tooManyRequests, message, error);
    case 'email_address_invalid':
      return new AuthServiceError(AUTH_ERROR_CODES.invalidEmail, message, error);
    default:
      return new AuthServiceError(AUTH_ERROR_CODES.unknown, message, error);
  }
}

/**
 * `AuthService` implementation backed by Supabase Auth.
 *
 * Instantiated internally by `provideSupabaseAuth`, not part of this
 * entry point's public API. Consumers always interact with it through the
 * `AUTH_SERVICE` token, never by importing this class directly.
 */
export class SupabaseAuthService implements AuthService {
  private readonly userSignal = signal<AuthUser | null>(null);

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  constructor(
    private readonly client: SupabaseClient,
    ngZone: NgZone,
  ) {
    // Same-tab auth changes are notified via a zone-patched setTimeout, so
    // they'd already run inside Angular's zone when zone.js is loaded.
    // Cross-tab sync is different: Supabase broadcasts session changes to
    // other open tabs via BroadcastChannel, and zone.js does NOT patch
    // BroadcastChannel by default — so a session change made in another
    // tab would update this signal without triggering change detection
    // here. Wrapping unconditionally covers both cases and matches the
    // same defensive pattern used for Firebase.
    client.auth.onAuthStateChange((_event, session) => {
      ngZone.run(() => {
        this.userSignal.set(session ? toAuthUser(session.user) : null);
      });
    });
  }

  /**
   * `options.persistent` is ignored: Supabase's session persistence
   * (`persistSession`) is a client-wide setting chosen once when
   * `createClient()` runs, not something a single sign-in call can
   * change afterward. There's no per-call equivalent to switch to for
   * this one sign-in.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async signIn(email: string, password: string, _options?: AuthSignInOptions): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw mapSupabaseError(error);
    return toAuthUser(data.user);
  }

  async signUp(email: string, password: string, profile?: AuthSignUpProfile): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      // "full_name" is the same key toAuthUser() reads first, see its
      // own comment above for why (matches the common OAuth convention).
      ...(profile?.displayName ? { options: { data: { full_name: profile.displayName } } } : {}),
    });
    if (error) throw mapSupabaseError(error);
    if (!data.user) {
      throw new Error('Supabase signUp() did not return a user.');
    }
    return toAuthUser(data.user);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw mapSupabaseError(error);
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email);
    if (error) throw mapSupabaseError(error);
  }

  /**
   * Supabase-specific: `code` is ignored entirely. Clicking the reset
   * link already establishes a recovery session client-side, through
   * whatever `detectSessionInUrl`/`flowType` the client was created
   * with (see `provide-supabase-auth.ts`); by the time this runs, the
   * session `updateUser()` needs is already active, with nothing left
   * for a code to select.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async completePasswordReset(newPassword: string, _code?: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password: newPassword });
    if (error) throw mapSupabaseError(error);
  }

  async getIdToken(): Promise<string | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw mapSupabaseError(error);
    return data.session?.access_token ?? null;
  }
}
