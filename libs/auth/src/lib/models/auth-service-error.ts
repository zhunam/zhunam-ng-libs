/**
 * Provider-agnostic error codes an `AuthService` implementation normalizes
 * every thrown error to. Each provider entry point (`@zhunam/auth/firebase`,
 * `@zhunam/auth/supabase`) maps its own SDK's error shape to one of these,
 * so a consumer branching on `AuthServiceError.code` never needs to know
 * which provider is active.
 */
export const AUTH_ERROR_CODES = {
  invalidCredential: 'auth/invalid-credential',
  emailAlreadyInUse: 'auth/email-already-in-use',
  userNotFound: 'auth/user-not-found',
  weakPassword: 'auth/weak-password',
  tooManyRequests: 'auth/too-many-requests',
  networkRequestFailed: 'auth/network-request-failed',
  invalidEmail: 'auth/invalid-email',
  invalidActionCode: 'auth/invalid-action-code',
  expiredActionCode: 'auth/expired-action-code',
  unknown: 'auth/unknown',
} as const;

/**
 * One of the normalized error codes in `AUTH_ERROR_CODES`.
 */
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/**
 * Error every `AuthService` method rejects with, instead of the raw error
 * a provider's SDK throws. `code` is always one of `AUTH_ERROR_CODES`, so a
 * consumer can branch on it without importing Firebase or Supabase types.
 * `message` is copied from the original error; `cause` keeps that original
 * error available for logging or a provider-specific fallback.
 *
 * `cause` is declared as an own property here, not inherited from `Error`,
 * so it doesn't depend on a `lib.es2022.error`-or-later `tsconfig` target
 * being set in the consuming app.
 *
 * @example
 * try {
 *   await authService.signIn(email, password);
 * } catch (error) {
 *   if (error instanceof AuthServiceError && error.code === AUTH_ERROR_CODES.invalidCredential) {
 *     // show a generic "wrong email or password" message
 *   }
 * }
 */
export class AuthServiceError extends Error {
  readonly code: AuthErrorCode;
  readonly cause: unknown;

  constructor(code: AuthErrorCode, message: string, cause: unknown) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
    this.cause = cause;
  }
}
