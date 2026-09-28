/**
 * Optional per-call sign-in behavior.
 */
export interface AuthSignInOptions {
  /**
   * Whether the session should survive closing the browser (`true`) or
   * only last for the current tab/window (`false`). Left `undefined`,
   * the provider's own configured default applies, and no persistence
   * call is made at all.
   *
   * Supabase ignores this: `persistSession` is a client-wide setting
   * chosen once when the client is created, not something a single
   * sign-in call can override. See `SupabaseAuthService.signIn()`'s own
   * comment for why this isn't silently worked around.
   */
  persistent?: boolean;
}
