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
  `findConflicts`). Recurrence isn't expanded yet, a recurring event is
  treated as a single occurrence at its literal `start`/`end` until
  `rrule` integration lands.
- `CalendarValidationError`: thrown by `addEvent()`/`updateEvent()` when
  the resulting event has an invalid `start`/`end` or `end` before
  `start`, or by `addEvent()` when the given `id` already exists in the
  store.

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
