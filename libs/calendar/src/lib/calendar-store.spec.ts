import { CalendarStore } from './calendar-store';
import { CalendarValidationError } from './errors/calendar-validation-error';
import type { CalendarEvent } from './models/calendar-event';

function buildEvent(id: string, start: string, end: string, extra?: Partial<CalendarEvent>): CalendarEvent {
  return { id, title: `Event ${id}`, start: new Date(start), end: new Date(end), ...extra };
}

describe('CalendarStore', () => {
  describe('addEvent / updateEvent / deleteEvent', () => {
    it('addEvent appends to events()', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');

      store.addEvent(event);

      expect(store.events()).toEqual([event]);
    });

    it('addEvent throws CalendarValidationError when end is before start', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T10:00:00Z', '2026-09-01T09:00:00Z');

      expect(() => store.addEvent(event)).toThrow(CalendarValidationError);
      expect(store.events()).toEqual([]);
    });

    it('addEvent throws CalendarValidationError when the id already exists, leaving the original untouched', () => {
      const store = new CalendarStore();
      const original = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      store.addEvent(original);
      const duplicate = buildEvent('1', '2026-09-02T09:00:00Z', '2026-09-02T10:00:00Z', {
        title: 'Different title',
      });

      expect(() => store.addEvent(duplicate)).toThrow(CalendarValidationError);
      expect(store.events()).toEqual([original]);
    });

    it('addEvent still works normally for a new id after a duplicate was rejected', () => {
      const store = new CalendarStore();
      const original = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      store.addEvent(original);
      expect(() => store.addEvent(buildEvent('1', '2026-09-02T09:00:00Z', '2026-09-02T10:00:00Z'))).toThrow(
        CalendarValidationError,
      );

      const other = buildEvent('2', '2026-09-03T09:00:00Z', '2026-09-03T10:00:00Z');
      store.addEvent(other);

      expect(store.events()).toEqual([original, other]);
    });

    it('updateEvent merges changes into the matching event', () => {
      const store = new CalendarStore();
      store.addEvent(buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z'));

      store.updateEvent('1', { title: 'Renamed' });

      expect(store.events()[0].title).toBe('Renamed');
    });

    it('updateEvent throws CalendarValidationError when the merged range is invalid', () => {
      const store = new CalendarStore();
      store.addEvent(buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z'));

      expect(() => store.updateEvent('1', { end: new Date('2026-09-01T08:00:00Z') })).toThrow(
        CalendarValidationError,
      );
      // Rejected update never applied.
      expect(store.events()[0].end).toEqual(new Date('2026-09-01T10:00:00Z'));
    });

    it('updateEvent is a no-op when no event matches the given id', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      store.addEvent(event);

      store.updateEvent('missing', { title: 'Should not apply' });

      expect(store.events()).toEqual([event]);
    });

    it('deleteEvent removes the matching event', () => {
      const store = new CalendarStore();
      store.addEvent(buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z'));
      store.addEvent(buildEvent('2', '2026-09-02T09:00:00Z', '2026-09-02T10:00:00Z'));

      store.deleteEvent('1');

      expect(store.events().map((event) => event.id)).toEqual(['2']);
    });

    it('deleteEvent is a no-op when no event matches the given id', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      store.addEvent(event);

      store.deleteEvent('missing');

      expect(store.events()).toEqual([event]);
    });
  });

  describe('eventsInRange', () => {
    it('includes an event that starts before the range and ends inside it', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T08:00:00Z', '2026-09-01T10:00:00Z');
      store.addEvent(event);

      const result = store.eventsInRange(new Date('2026-09-01T09:00:00Z'), new Date('2026-09-01T11:00:00Z'));

      expect(result()).toEqual([event]);
    });

    it('includes an event that starts inside the range and ends after it', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T10:00:00Z', '2026-09-01T12:00:00Z');
      store.addEvent(event);

      const result = store.eventsInRange(new Date('2026-09-01T09:00:00Z'), new Date('2026-09-01T11:00:00Z'));

      expect(result()).toEqual([event]);
    });

    it('includes an event that fully contains the range', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T08:00:00Z', '2026-09-01T12:00:00Z');
      store.addEvent(event);

      const result = store.eventsInRange(new Date('2026-09-01T09:00:00Z'), new Date('2026-09-01T11:00:00Z'));

      expect(result()).toEqual([event]);
    });

    it('excludes an event that ends exactly when the range starts', () => {
      const store = new CalendarStore();
      store.addEvent(buildEvent('1', '2026-09-01T07:00:00Z', '2026-09-01T09:00:00Z'));

      const result = store.eventsInRange(new Date('2026-09-01T09:00:00Z'), new Date('2026-09-01T11:00:00Z'));

      expect(result()).toEqual([]);
    });

    it('excludes an event that starts exactly when the range ends', () => {
      const store = new CalendarStore();
      store.addEvent(buildEvent('1', '2026-09-01T11:00:00Z', '2026-09-01T12:00:00Z'));

      const result = store.eventsInRange(new Date('2026-09-01T09:00:00Z'), new Date('2026-09-01T11:00:00Z'));

      expect(result()).toEqual([]);
    });

    it('is reactive to events added after the signal was created', () => {
      const store = new CalendarStore();
      const result = store.eventsInRange(new Date('2026-09-01T09:00:00Z'), new Date('2026-09-01T11:00:00Z'));
      expect(result()).toEqual([]);

      const event = buildEvent('1', '2026-09-01T09:30:00Z', '2026-09-01T10:00:00Z');
      store.addEvent(event);

      expect(result()).toEqual([event]);
    });
  });

  describe('findConflicts', () => {
    it('detects a real overlap', () => {
      const store = new CalendarStore();
      const existing = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      store.addEvent(existing);
      const candidate = buildEvent('2', '2026-09-01T09:30:00Z', '2026-09-01T10:30:00Z');

      expect(store.findConflicts(candidate)()).toEqual([existing]);
    });

    it('does not flag adjacent, non-overlapping events as conflicts', () => {
      const store = new CalendarStore();
      store.addEvent(buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z'));
      const candidate = buildEvent('2', '2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z');

      expect(store.findConflicts(candidate)()).toEqual([]);
    });

    it('excludes the event itself when it is already in the store', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      store.addEvent(event);

      expect(store.findConflicts(event)()).toEqual([]);
    });
  });

  describe('recurrence (temporary single-occurrence limitation)', () => {
    it('treats a recurring event as a single occurrence at its literal start/end', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z', {
        recurrence: 'FREQ=DAILY;COUNT=5',
      });
      store.addEvent(event);

      // A later occurrence implied by the RRULE (e.g. the next day) is not
      // found: recurrence expansion isn't implemented yet.
      const nextDay = store.eventsInRange(new Date('2026-09-02T09:00:00Z'), new Date('2026-09-02T10:00:00Z'));
      expect(nextDay()).toEqual([]);

      // Only the literal occurrence is found.
      const literalOccurrence = store.eventsInRange(
        new Date('2026-09-01T09:00:00Z'),
        new Date('2026-09-01T10:00:00Z'),
      );
      expect(literalOccurrence()).toEqual([event]);
    });
  });
});
