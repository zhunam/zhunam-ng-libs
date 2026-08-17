/**
 * Represents the currently authenticated user.
 *
 * Deliberately minimal: does NOT include any token, credential, or
 * provider-specific metadata. Never add fields here without evaluating
 * whether exposing them increases attack surface. If a consumer needs an
 * auth token for an authenticated HTTP call, use AuthService.getIdToken()
 * instead, never a property on this interface.
 */
export interface AuthUser {
  /** Unique, stable identifier assigned by the auth provider. */
  uid: string;

  /** User's email address, or `null` if the provider didn't return one. */
  email: string | null;

  /** Whether the user has verified their email address. */
  emailVerified: boolean;

  /** User's display name, or `null` if none is set. */
  displayName: string | null;
}
