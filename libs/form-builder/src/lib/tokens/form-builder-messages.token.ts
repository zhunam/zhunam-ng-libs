import { InjectionToken, Provider } from '@angular/core';
import { FormBuilderMessages, FORM_BUILDER_MESSAGES_EN } from '../models/form-builder-messages';

/**
 * DI token for the active `FormBuilderMessages` set. Defaults to
 * `FORM_BUILDER_MESSAGES_EN` when no provider is registered.
 *
 * A per-field `FieldValidatorConfig.errorMessages` override, when set,
 * still takes precedence over this token for that specific field: this
 * token supplies the message only when the field itself doesn't override
 * that validator's text.
 *
 * Prefer `provideFormBuilderMessages()` over providing this token
 * directly, it merges your overrides on top of the English defaults
 * instead of requiring every message to be re-specified.
 */
export const FORM_BUILDER_MESSAGES = new InjectionToken<FormBuilderMessages>('FORM_BUILDER_MESSAGES', {
  providedIn: 'root',
  factory: () => FORM_BUILDER_MESSAGES_EN,
});

/**
 * Registers a `FormBuilderMessages` override, merged on top of the
 * English defaults so a partial override (e.g. only `submit`) leaves the
 * rest in English instead of requiring the full set.
 *
 * @param overrides Messages to override. Any member left out falls back
 * to `FORM_BUILDER_MESSAGES_EN`.
 * @example
 * // Full preset:
 * providers: [provideFormBuilderMessages(FORM_BUILDER_MESSAGES_ES)]
 * @example
 * // Partial override, everything else stays in English:
 * providers: [provideFormBuilderMessages({ min: () => 'Must be greater than 0' })]
 */
export function provideFormBuilderMessages(overrides: Partial<FormBuilderMessages>): Provider {
  return {
    provide: FORM_BUILDER_MESSAGES,
    useValue: { ...FORM_BUILDER_MESSAGES_EN, ...overrides },
  };
}
