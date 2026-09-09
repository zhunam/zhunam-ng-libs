import type { CalendarEvent } from '@zhunam/calendar';
import type { CalendarEvent as NgCalendarEvent } from 'angular-calendar';

/**
 * Maps our own `CalendarEvent<T>` to `angular-calendar`'s own event
 * shape, confirmed against the real installed package (`calendar-utils`
 * 0.32.2's `CalendarEvent<MetaType>`), not assumed:
 *
 * - `meta` genuinely exists and is generic over `MetaType`, so the
 *   original `CalendarEvent<T>` is stashed there whole (typed as
 *   `NgCalendarEvent<CalendarEvent<T>>`), letting click/drag handlers
 *   read it straight back out instead of re-deriving or re-fetching it.
 * - **`resizable` is NOT a boolean**, confirmed against the real type:
 *   `{ beforeStart?: boolean; afterEnd?: boolean }`, one flag per edge.
 *   A recurring event gets `undefined` (both edges implicitly
 *   disabled); a non-recurring one gets both edges `true`. Confirmed
 *   this is actually enforced, not just documented, by reading
 *   `angular-calendar`'s own compiled template output: the resize
 *   handle for each edge is only rendered when
 *   `event.resizable?.beforeStart`/`afterEnd` is truthy.
 * - `draggable` genuinely is a plain boolean. Also confirmed enforced
 *   at the template level, not just documented: `[dragAxis]="{ x:
 *   event.draggable, y: event.draggable }"` in the compiled source,
 *   `false` on both axes really does disable the `mwlDraggable`
 *   directive's movement.
 */
export function mapToAngularCalendarEvent<T>(event: CalendarEvent<T>): NgCalendarEvent<CalendarEvent<T>> {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    draggable: !event.recurrence,
    resizable: event.recurrence ? undefined : { beforeStart: true, afterEnd: true },
    meta: event,
  };
}
