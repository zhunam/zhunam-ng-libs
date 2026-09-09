import { rrulestr } from 'rrule';
import { CalendarValidationError } from '@zhunam/calendar';
import type { CalendarEvent } from '@zhunam/calendar';

/**
 * Deliberately duplicated from `CalendarStore`'s own internal
 * `assertValidEvent()` in the core, not imported from it. Confirmed
 * empirically, via real `nx build calendar` runs, that neither a plain
 * relative import reaching across entry points
 * (`../../../src/lib/calendar-store`, `Cannot find module`) nor a
 * private `tsconfig.base.json` path alias shaped like
 * `@zhunam/calendar/<anything>` (`Entry point @zhunam/calendar/internal
 * ... doesn't exist`, ng-packagr treats every such subpath as a real
 * secondary entry point that must actually exist) works. The only
 * mechanism that does work is importing through the core's real public
 * barrel (`@zhunam/calendar`, i.e. `src/index.ts`), which would have
 * meant promoting this validation helper to the public API just to
 * satisfy this one call site. A small, independent duplicate here was
 * the better trade-off; see CLAUDE.md for the full investigation, this
 * applies to any future library in this workspace with multiple entry
 * points that need to share an internal (not public) helper.
 */
export function assertValidEvent(event: Pick<CalendarEvent, 'start' | 'end' | 'recurrence'>): void {
  if (!(event.start instanceof Date) || isNaN(event.start.getTime())) {
    throw new CalendarValidationError(
      `CalendarEvent.start must be a valid Date, received ${String(event.start)}.`,
    );
  }

  if (!(event.end instanceof Date) || isNaN(event.end.getTime())) {
    throw new CalendarValidationError(
      `CalendarEvent.end must be a valid Date, received ${String(event.end)}.`,
    );
  }

  if (event.end < event.start) {
    throw new CalendarValidationError(
      `CalendarEvent.end (${event.end.toISOString()}) cannot be before start (${event.start.toISOString()}).`,
    );
  }

  if (event.recurrence !== undefined) {
    try {
      rrulestr(event.recurrence, { dtstart: event.start });
    } catch (cause) {
      throw new CalendarValidationError(
        `CalendarEvent.recurrence is not a valid RRULE string, received "${event.recurrence}": ${(cause as Error).message}`,
      );
    }
  }
}
