import { InjectionToken, Provider } from '@angular/core';
import { AuthUiMessages, AUTH_UI_MESSAGES_EN } from '../models/auth-ui-messages';

/**
 * DI token for the active `AuthUiMessages` set. Defaults to
 * `AUTH_UI_MESSAGES_EN` when no provider is registered.
 *
 * Prefer `provideAuthUiMessages()` over providing this token directly,
 * it merges your overrides on top of the English defaults instead of
 * requiring every message to be re-specified.
 */
export const AUTH_UI_MESSAGES = new InjectionToken<AuthUiMessages>('AUTH_UI_MESSAGES', {
  providedIn: 'root',
  factory: () => AUTH_UI_MESSAGES_EN,
});

/**
 * Registers an `AuthUiMessages` override, merged on top of the English
 * defaults so a partial override (e.g. only `forgotPassword`) leaves the
 * rest in English instead of requiring the full set.
 *
 * @param overrides Messages to override. Any member left out falls back
 * to `AUTH_UI_MESSAGES_EN`.
 * @example
 * // Full preset:
 * providers: [provideAuthUiMessages(AUTH_UI_MESSAGES_ES)]
 * @example
 * // Partial override, everything else stays in English:
 * providers: [provideAuthUiMessages({ forgotPassword: () => 'Need help signing in?' })]
 */
export function provideAuthUiMessages(overrides: Partial<AuthUiMessages>): Provider {
  return {
    provide: AUTH_UI_MESSAGES,
    useValue: { ...AUTH_UI_MESSAGES_EN, ...overrides },
  };
}
