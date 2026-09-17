# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [2.0.0] - 2026-09-17

### Added
- `--zhunam-calendar-event-dot-color` custom property (default
  `#1e90ff`, `@zhunam/calendar/calendar-ui`): the "has events" dot on
  month-view days now reads from this property instead of a hardcoded
  `background-color: #1e90ff`. Deliberately its own property, not
  `--zhunam-primary`: it matches `angular-calendar`'s own default event
  color, a separate visual anchor from this toolbar's accent.

### Changed
- **BREAKING** (`@zhunam/calendar/calendar-ui`): `CalendarBoard`'s CSS
  custom properties are renamed to the shared `--zhunam-*` namespace,
  unified across all `@zhunam/*` libraries so they use one consistent
  name per theming role instead of a library-specific `--cal-board-*`
  prefix. No compatibility aliases are kept for the old names; update
  any stylesheet that sets one of them.
- Every `var()` usage now carries an inline fallback matching its
  `:host` default, so the component degrades gracefully if that
  declaration is ever missing instead of resolving to an invalid value.

| Old name | New name |
| ------------------------ | -------------------- |
| `--cal-board-text-color`  | `--zhunam-text`     |
| `--cal-board-border-color`| `--zhunam-border`   |
| `--cal-board-accent-color`| `--zhunam-primary`  |
| `--cal-board-font-family` | `--zhunam-font-family` |

## [1.0.0] - 2026-09-08

### Added
- `CalendarEvent<T>`: generic event model (`id`, `title`, `start`, `end`,
  `allDay`, `recurrence` as an RRULE string, `data: T`). Modeled as a
  half-open range `[start, end)`.
- `CalendarStore`: in-memory, signal-based CRUD store (`events`,
  `addEvent`, `updateEvent`, `deleteEvent`, `eventsInRange`,
  `findConflicts`).
- Real `recurrence` expansion via `rrule`: `eventsInRange()` and
  `findConflicts()` both expand a recurring `CalendarEvent` into one
  entry per matching occurrence (via `.between()`, never an unbounded
  `.all()`, so an event with no `COUNT`/`UNTIL` can't hang a query).
  Occurrences share their source event's `id`, by design, since they're
  not independent events. An occurrence that starts before the queried
  range but overlaps it because of its own duration is included, not
  missed. `addEvent()`/`updateEvent()` reject a `recurrence` string that
  doesn't parse as a real RRULE before saving anything.
- Expansion cap: a single recurring event contributes at most 1000
  occurrences to one `eventsInRange()`/`findConflicts()` call, even
  against a high-frequency rule with no `COUNT`/`UNTIL` (e.g.
  `FREQ=SECONDLY`) over a wide range. Enforced at the source via
  `rrule`'s own `between()` iterator, `rrule` never materializes more
  than the limit internally. Never throws, doesn't break the rest of
  the query, but does `console.warn()` with the event's `id`,
  `recurrence` string, and the limit reached.
- `CalendarValidationError`: thrown by `addEvent()`/`updateEvent()` when
  the resulting event has an invalid `start`/`end`, `end` before
  `start`, or an unparseable `recurrence`, or by `addEvent()` when the
  given `id` already exists in the store.
- `@zhunam/calendar/google`, new secondary entry point:
  `GoogleCalendarConnector` (`isConnected`, `connect(clientId)`,
  `disconnect()`), authorization-only against Google Identity Services
  (the current OAuth2 token model, not the deprecated `gapi.auth2`).
  `connect()` requests the `https://www.googleapis.com/auth/calendar.events`
  scope and resolves once the user grants access; `disconnect()` clears
  local state synchronously and best-effort revokes the token with
  Google. No silent/background token renewal in this first half
  (Google's own docs don't characterize `prompt: 'none'` as reliable
  enough to promise it); reading/writing actual events is a separate,
  later addition. The GIS script itself is loaded dynamically from
  Google's own CDN only when `connect()` is actually called, never
  bundled with this library (self-hosting it isn't supported by
  Google). The access token lives in a real ECMAScript `#private`
  field, never a TypeScript-only `private` one, and is never exposed
  through any public method.
- `GoogleCalendarConnector.listEvents(range)`: reads events from the
  user's primary Google Calendar via the real Calendar API v3 REST
  endpoint, mapped to `CalendarEvent`. A recurring event keeps only its
  first RRULE line (any EXRULE/RDATE/EXDATE or additional RRULE is
  dropped); an all-day event maps to `allDay: true` with the correct
  calendar date regardless of the runtime's local timezone. Throws
  `GoogleCalendarNotConnectedError` if called before `connect()`
  succeeds (no fetch attempted), or `GoogleApiError` (both new,
  exported from `@zhunam/calendar/google`) on a non-2xx response; a
  `401` specifically also clears `isConnected()`, since it means the
  token expired or was revoked.
- `GoogleCalendarConnector.createEvent(event)`: creates a new event on
  the user's primary Google Calendar, validated (same rules as
  `CalendarStore`) before any fetch. `event.data` is never sent to
  Google (no equivalent field in its `Event` schema) but is preserved
  on the returned `CalendarEvent`.
- `GoogleCalendarConnector.updateEvent(id, changes)`: updates an
  existing event via a real `PATCH` request, sending only the changed
  fields. If `changes` touches `start`, `end`, or `recurrence`, fetches
  the event's current state first and validates the merged result
  (same "validate the final result, not `changes` in isolation"
  criterion `CalendarStore.updateEvent()` already uses) before sending
  anything; an invalid merge never reaches Google.
- `GoogleCalendarConnector.deleteEvent(id)`: deletes an event via a real
  `DELETE` request. A `410` (Google's own confirmed response for an
  event that's already deleted) resolves as a successful no-op, not an
  error, matching Google's own guidance that no further action is
  needed; a `404` (an id that never existed) is still a real error.
- Both `createEvent()`/`updateEvent()` throw `GoogleCalendarNotConnectedError`
  if called before `connect()` succeeds, or `GoogleApiError` on a
  non-2xx response (`401` also clears `isConnected()`), same as
  `listEvents()`. `deleteEvent()` follows the same connection/error
  rules, `410` aside.
- `@zhunam/calendar/calendar-ui`, new secondary entry point:
  `CalendarBoard` (`events`, `viewMode`, `viewDate` as `model()`,
  `eventClick`, `eventReschedule`, `visibleRangeChange`), a month/week/
  day calendar board built on `angular-calendar` internally, never
  exposed in this component's own public API. A recurring event
  (`recurrence` set) renders as non-draggable and non-resizable.
  `visibleRangeChange` emits an exclusive `[start, end)` range (the
  start of the *next* period, not `angular-calendar`'s own inclusive
  `endOf*()` boundary) whenever `viewDate()`/`viewMode()` changes.
  `CalendarBoardModule` NgModule wrapper included, same pattern as this
  workspace's other libraries. Requires `date-fns` (new `dependencies`
  entry, `angular-calendar`'s own peer requirement for its
  `DateAdapter`) and, separately, importing `angular-calendar`'s own
  stylesheet (`angular-calendar/css/angular-calendar.css`) in the
  consuming app; this component only styles its own toolbar.
- Month view: clicking a day (with events or not) switches straight to
  day view for that date (`viewDate`/`viewMode` set accordingly), a
  simple way to see a day's full schedule without leaving the board. No
  new public API, purely internal wiring of `angular-calendar`'s own
  `dayClicked` output on `CalendarMonthViewComponent`.
- Month view's day badge (previously a number showing how many events a
  day has) is now a plain "this day has at least one event" indicator,
  same size regardless of count, and absent entirely for a day with
  none. `angular-calendar` has no way to reshape only the badge without
  replacing the day cell's entire content (a real `cellTemplate` input,
  confirmed against the installed package, but one that would require
  hand-rebuilding the cell's other content, including each event's own
  drag/drop/click directives, entirely on this library's side), so this
  is done via CSS in `calendar-board.scss` instead.

### Fixed
- `GoogleCalendarConnector.listEvents()` now follows `nextPageToken`
  automatically, accumulating events across pages, instead of only
  ever returning the first page. Capped at 4 pages (`MAX_PAGES_PER_FETCH`),
  250 events each (`maxResults`, Google's own confirmed default,
  requested explicitly rather than left implicit): a 1000-event
  ceiling per call, matching `CalendarStore`'s own
  `MAX_OCCURRENCES_PER_EXPANSION`. Reaching the limit never throws,
  `listEvents()` returns everything accumulated so far and
  `console.warn()`s with the queried range and the total returned.
- `CalendarStore.addEvent()` now rejects an event whose `id` already
  matches one already in the store (`CalendarValidationError`), instead
  of silently adding it as a duplicate. The original event is left
  untouched either way.
- `CalendarStore.addEvent()`/`updateEvent()` now validate that
  `start`/`end` are real `Date` instances, not an `Invalid Date` and not
  a value that merely satisfies the `CalendarEvent` type at compile time
  (e.g. a plain string). Previously an invalid value passed through
  silently and could corrupt every range comparison later
  (`eventsInRange()`, `findConflicts()`).
- `CalendarStore.addEvent()`/`updateEvent()` now store a defensive copy
  of the event, cloning its `start`/`end` `Date` objects. Previously the
  store kept the exact object/`Date` references handed to it, so
  mutating them after the call (e.g. `event.start.setFullYear(...)`)
  silently corrupted the store's own state from the outside.
- `CalendarBoard` month view no longer renders the small colored dot
  `angular-calendar` draws under each day with events. It's colored via
  `event.color?.primary`, a field `CalendarEvent` has no equivalent of in
  v1, so every dot rendered the same default blue, no information beyond
  what the numeric day badge already shows. Neutralized via
  `background-color`, not hidden outright: the same element is also the
  drag handle for month-view rescheduling, and removing it from the
  layout would have silently broken dragging an event to a different
  day.
