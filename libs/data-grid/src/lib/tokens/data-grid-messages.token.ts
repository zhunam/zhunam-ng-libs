import { InjectionToken, Provider } from '@angular/core';
import { DataGridMessages, DATA_GRID_MESSAGES_EN } from '../models/data-grid-messages';

/**
 * DI token for the active `DataGridMessages` set. Defaults to
 * `DATA_GRID_MESSAGES_EN` when no provider is registered.
 *
 * Prefer `provideDataGridMessages()` over providing this token directly,
 * it merges your overrides on top of the English defaults instead of
 * requiring every message to be re-specified.
 */
export const DATA_GRID_MESSAGES = new InjectionToken<DataGridMessages>('DATA_GRID_MESSAGES', {
  providedIn: 'root',
  factory: () => DATA_GRID_MESSAGES_EN,
});

/**
 * Registers a `DataGridMessages` override, merged on top of the English
 * defaults so a partial override (e.g. only `next`) leaves the rest in
 * English instead of requiring the full set.
 *
 * @param overrides Messages to override. Any member left out falls back
 * to `DATA_GRID_MESSAGES_EN`.
 * @example
 * // Full preset:
 * providers: [provideDataGridMessages(DATA_GRID_MESSAGES_ES)]
 * @example
 * // Partial override, everything else stays in English:
 * providers: [provideDataGridMessages({ next: () => 'Forward' })]
 */
export function provideDataGridMessages(overrides: Partial<DataGridMessages>): Provider {
  return {
    provide: DATA_GRID_MESSAGES,
    useValue: { ...DATA_GRID_MESSAGES_EN, ...overrides },
  };
}
