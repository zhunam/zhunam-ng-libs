import { Signal } from '@angular/core';
import { AuthUser } from './auth-user';
import { AuthSignInOptions } from './auth-sign-in-options';
import { AuthSignUpProfile } from './auth-sign-up-profile';

/**
 * Base contract for a provider-backed authentication service.
 *
 * This is the interface each provider entry point (`@zhunam/auth/firebase`,
 * `@zhunam/auth/supabase`) must implement. The core (`@zhunam/auth`) ships
 * only this contract, no concrete implementation.
 */
export interface AuthService {
  /**
   * The currently authenticated user, or `null` if signed out.
   * Read-only signal that updates reactively as auth state changes.
   */
  readonly currentUser: Signal<AuthUser | null>;

  /**
   * Whether a user is currently authenticated.
   * Read-only signal derived from `currentUser`.
   */
  readonly isAuthenticated: Signal<boolean>;

  /**
   * Signs in an existing user with email and password.
   * @param email User's email address.
   * @param password User's password.
   * @param options Per-call sign-in behavior. See `AuthSignInOptions`.
   * @returns The signed-in user.
   */
  signIn(email: string, password: string, options?: AuthSignInOptions): Promise<AuthUser>;

  /**
   * Creates a new user account with email and password.
   * @param email Email address for the new account.
   * @param password Password for the new account.
   * @param profile Optional profile data, e.g. a display name. See `AuthSignUpProfile`.
   * @returns The newly created user.
   */
  signUp(email: string, password: string, profile?: AuthSignUpProfile): Promise<AuthUser>;

  /**
   * Signs out the current user.
   */
  signOut(): Promise<void>;

  /**
   * Sends a password reset email via the provider's native flow.
   * @param email Email address to send the reset link to.
   */
  resetPassword(email: string): Promise<void>;

  /**
   * Completes a password reset started by `resetPassword()`. Optional:
   * an implementation that doesn't support it (none currently) can leave
   * it undefined.
   *
   * The two providers this library supports handle this step
   * differently, which is why `code` is optional and provider-specific:
   * - Firebase requires `code`, the `oobCode` query parameter from the
   *   reset link, extracted by the consumer from the page URL. Calling
   *   this without one fails with `AUTH_ERROR_CODES.invalidActionCode`,
   *   without ever reaching the Firebase SDK.
   * - Supabase ignores `code` entirely: clicking the reset link already
   *   establishes a recovery session client-side (see
   *   `SupabaseAuthService.completePasswordReset()`'s own comment for
   *   the exact mechanism), so there's nothing left for a code to
   *   select.
   *
   * @param newPassword The user's new password.
   * @param code Provider-specific action code. Required for Firebase,
   *   ignored by Supabase.
   */
  completePasswordReset?(newPassword: string, code?: string): Promise<void>;

  /**
   * Updates the signed-in user's display name. Optional: both
   * `FirebaseAuthService` and `SupabaseAuthService` support it.
   *
   * Rejects with `AUTH_ERROR_CODES.userNotFound` without ever reaching
   * the provider's SDK if no user is currently signed in, the same
   * local-guard pattern `changePassword()` uses.
   *
   * @param displayName The new display name.
   */
  updateProfile?(displayName: string): Promise<void>;

  /**
   * Changes the signed-in user's password, verifying `currentPassword`
   * first. Optional: both `FirebaseAuthService` and `SupabaseAuthService`
   * support it.
   *
   * Rejects, without changing the password, with one of:
   * - `AUTH_ERROR_CODES.userNotFound`: no user is currently signed in, or
   *   the current user has no email (e.g. a phone-only account, or one
   *   linked only to an OAuth provider with no password credential to
   *   verify against). Rejected locally, before ever reaching the
   *   provider's SDK.
   * - `AUTH_ERROR_CODES.invalidCredential`: `currentPassword` doesn't
   *   match the signed-in user's actual password.
   * - `AUTH_ERROR_CODES.weakPassword`: `newPassword` doesn't meet the
   *   provider's own password policy. Not validated locally by this
   *   library; the provider's server is the only source of truth for
   *   password strength.
   * - `AUTH_ERROR_CODES.unknown`: Supabase only, when the provider
   *   rejects `newPassword` for being the same as the current one
   *   (Supabase's own `same_password` error code has no dedicated
   *   `AUTH_ERROR_CODES` member; `cause` still carries the original
   *   Supabase error for a consumer that needs to distinguish it).
   *
   * @param currentPassword The user's current password, verified before
   *   the change.
   * @param newPassword The new password.
   */
  changePassword?(currentPassword: string, newPassword: string): Promise<void>;

  /**
   * Gets a fresh ID token for the current user, for use in authenticated
   * HTTP calls.
   * @returns The ID token, or `null` if no user is signed in.
   */
  getIdToken(): Promise<string | null>;
}
