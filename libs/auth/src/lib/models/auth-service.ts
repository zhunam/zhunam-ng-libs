import { Signal } from '@angular/core';
import { AuthUser } from './auth-user';

/**
 * Base contract for a provider-backed authentication service.
 *
 * This is the interface each provider entry point (`@zhunam/auth/firebase`,
 * `@zhunam/auth/supabase`) must implement. The core (`@zhunam/auth`) ships
 * only this contract — no concrete implementation.
 */
export interface AuthService {
  /**
   * The currently authenticated user, or `null` if signed out.
   * Read-only signal — updates reactively as auth state changes.
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
   * @returns The signed-in user.
   */
  signIn(email: string, password: string): Promise<AuthUser>;

  /**
   * Creates a new user account with email and password.
   * @param email Email address for the new account.
   * @param password Password for the new account.
   * @returns The newly created user.
   */
  signUp(email: string, password: string): Promise<AuthUser>;

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
   * Gets a fresh ID token for the current user, for use in authenticated
   * HTTP calls.
   * @returns The ID token, or `null` if no user is signed in.
   */
  getIdToken(): Promise<string | null>;
}
