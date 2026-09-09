# @zhunam/calendar

A calendar library for Angular: a signal-based in-memory event store
with real RRULE recurrence, an optional Google Calendar connector, and
an optional month/week/day UI component. The core works completely on
its own; `/google` and `/calendar-ui` are independent add-ons, use
either, both, or neither.

## Entry points

| Entry point | Required? | What it gives you |
| ------------------------- | -------- | ------------------------------------------------------- |
| `@zhunam/calendar`          | Always   | `CalendarEvent<T>`, `CalendarStore`, `CalendarValidationError` |
| `@zhunam/calendar/google`      | Optional | `GoogleCalendarConnector`: real Google Calendar read/write |
| `@zhunam/calendar/calendar-ui` | Optional | `CalendarBoard`: a month/week/day UI component            |

## Installation

```bash
npm install @zhunam/calendar
```

`angular-calendar`, `rrule`, and `date-fns` ship bundled as internal
dependencies of this library. You never install or configure them
yourself, regardless of which entry points you use.

## Usage

### Core

```typescript
import { CalendarStore, type CalendarEvent } from '@zhunam/calendar';

const store = new CalendarStore();
const event: CalendarEvent = { id: '1', title: 'Standup', start: new Date(), end: new Date() };
store.addEvent(event);

const upcoming = store.eventsInRange(new Date(), new Date(Date.now() + 7 * 86400000));
```

### `/google`

```typescript
import { Component } from '@angular/core';
import { GoogleCalendarConnector } from '@zhunam/calendar/google';

@Component({ selector: 'app-agenda' })
export class AgendaPage {
  private readonly connector = new GoogleCalendarConnector();

  async loadEvents() {
    await this.connector.connect(GOOGLE_CLIENT_ID);
    return this.connector.listEvents({ start: new Date(), end: nextWeek });
  }
}
```

### `/calendar-ui`

```html
<lib-calendar-board
  [events]="events()"
  [(viewMode)]="viewMode"
  [(viewDate)]="viewDate"
  (eventClick)="onEventClick($event)"
  (eventReschedule)="onEventReschedule($event)"
/>
```

`angular-calendar` ships its own base stylesheet; `CalendarBoard` only
styles its own toolbar. Import it once in your app (e.g. in
`angular.json`'s `styles` array, or a global stylesheet):

```scss
@import 'angular-calendar/css/angular-calendar.css';
```

## API

### Core (`@zhunam/calendar`)

`CalendarEvent<T>`

| Field        | Type      | Description                                                 |
| ------------- | ---------- | -------------------------------------------------------------- |
| `id`          | `string`   | Unique identifier. You assign it; nothing here generates one.  |
| `title`       | `string`   | Display title.                                                 |
| `start`       | `Date`     | Start of the event, inclusive.                                 |
| `end`         | `Date`     | End of the event, exclusive (`[start, end)`).                  |
| `allDay`      | `boolean?` | Whether this is an all-day event. Default `false`.              |
| `recurrence`  | `string?`  | RRULE string (RFC 5545), e.g. `'FREQ=WEEKLY;COUNT=5'`. The `RRULE:` prefix is optional. |
| `data`        | `T?`       | Your own domain data attached to the event. Never read or written by this library. |

`CalendarStore`

| Member                                | Type                                | Description                                                    |
| --------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `events`                                | `Signal<CalendarEvent[]>`             | Every event in the store, in insertion order.                      |
| `addEvent(event)`                       | `void`                                | Throws `CalendarValidationError` if invalid or the `id` already exists. |
| `updateEvent(id, changes)`              | `void`                                | Validates the merged result, not `changes` alone. No-op if `id` isn't found. |
| `deleteEvent(id)`                       | `void`                                | No-op if `id` isn't found.                                          |
| `eventsInRange(start, end)`             | `Signal<CalendarEvent[]>`             | Expands recurring events into their real occurrences via `rrule`.   |
| `findConflicts(event)`                  | `Signal<CalendarEvent[]>`             | Other events (including occurrences of recurring ones) overlapping `event`. |

### `@zhunam/calendar/google`

`GoogleCalendarConnector`

| Member                       | Type                                | Description                                                       |
| ------------------------------ | -------------------------------------- | ----------------------------------------------------------------------- |
| `isConnected`                   | `Signal<boolean>`                      | Whether a valid access token is currently held.                          |
| `connect(clientId)`             | `Promise<void>`                        | Shows Google's consent screen. `clientId` is a public OAuth Client ID, not a secret. |
| `disconnect()`                  | `void`                                 | Clears local state and best-effort revokes the token with Google.        |
| `listEvents(range)`             | `Promise<CalendarEvent[]>`             | Reads events from the user's primary calendar, paginated automatically.  |
| `createEvent(event)`            | `Promise<CalendarEvent<T>>`            | Creates an event. `event.data` is never sent to Google.                  |
| `updateEvent(id, changes)`      | `Promise<CalendarEvent<T>>`            | Partial update via a real `PATCH`, only the changed fields are sent.     |
| `deleteEvent(id)`               | `Promise<void>`                        | Deleting an already-deleted event resolves as success, not an error.     |

Errors

| Error                          | Thrown when                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `CalendarValidationError`         | An event has an invalid `start`/`end`, `end` before `start`, or an unparseable `recurrence` (core `CalendarStore`, or `createEvent()`/`updateEvent()` here). |
| `GoogleApiError`                  | Google responds with a non-2xx status (a `410` on `deleteEvent()` doesn't count, see above). `status` carries the real HTTP code. |
| `GoogleCalendarNotConnectedError` | Any method other than `connect()` is called while `isConnected()` is `false`, before any request is attempted. |

### `@zhunam/calendar/calendar-ui`

`CalendarBoard` (`<lib-calendar-board>`)

| Name                 | Type                                      | Description                                                        |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| `events`                | `input.required<CalendarEvent<T>[]>`         | Events to display. A recurring event renders as a single non-draggable, non-resizable card. |
| `viewMode`              | `model<'month' \| 'week' \| 'day'>`          | The currently shown view. Default `'month'`.                             |
| `viewDate`              | `model<Date>`                                | The date the current view is anchored on.                                |
| `eventClick`            | `output<CalendarEvent<T>>`                   | Emitted with the original event when its card is clicked.                |
| `eventReschedule`       | `output<{ id, start, end }>`                 | Emitted after a drag or resize. Never emitted for a recurring event.     |
| `visibleRangeChange`    | `output<{ start, end }>`                     | The visible `[start, end)` range, emitted whenever `viewDate`/`viewMode` changes. |

`CalendarBoardModule`: `NgModule` wrapper for consumers still on a
classic NgModule architecture. The standalone component is still the
recommended way to consume it.

## Compatibility

`@angular/core` `^20.0.0 || ^21.0.0 || ^22.0.0`, the only peer
dependency across all three entry points. `angular-calendar`, `rrule`,
and `date-fns` are bundled `dependencies` of this library, not peer
dependencies: you never pick a version for them yourself.

## Behavior limits

- `CalendarStore.eventsInRange()`/`findConflicts()`: a single recurring
  event contributes at most 1000 occurrences to one call, even against
  a high-frequency rule with no `COUNT`/`UNTIL`.
- `GoogleCalendarConnector.listEvents()`: at most 1000 events per call
  (4 pages of 250).

Both limits exist to keep a single call bounded against pathological
input (an unbounded recurrence, an extremely loaded calendar); neither
throws when hit, both `console.warn()` instead, so an incomplete result
is discoverable while debugging rather than silently short.

## Why this one

A reactive core that's actually useful standalone, no backend, no
external provider required to model events, recurrence, and conflicts.
Google Calendar sync is opt-in and keeps its access token genuinely
unreadable from outside the connector (a real ECMAScript `#private`
field, not just a TypeScript annotation). The optional UI wraps
`angular-calendar` without ever leaking its types into your code, swap
the rendering engine later without touching your app.

## License

MIT

---

Built by Ariana Mora · [LinkedIn](https://www.linkedin.com/in/ariana-andreina-mora) · [GitHub](https://github.com/zhunam)
