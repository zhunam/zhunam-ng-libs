# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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

### Fixed
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
