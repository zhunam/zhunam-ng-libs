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

    it('addEvent throws CalendarValidationError when start is not a Date', () => {
      const store = new CalendarStore();
      const event = {
        ...buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z'),
        start: '2026-09-01T09:00:00Z',
      } as unknown as CalendarEvent;

      expect(() => store.addEvent(event)).toThrow(CalendarValidationError);
      expect(store.events()).toEqual([]);
    });

    it('addEvent throws CalendarValidationError for a real Invalid Date', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z', {
        start: new Date('not-a-real-date'),
      });

      expect(() => store.addEvent(event)).toThrow(CalendarValidationError);
      expect(store.events()).toEqual([]);
    });

    it('stores a defensive copy: mutating the original Date after addEvent does not affect the store', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      const originalStartTime = event.start.getTime();

      store.addEvent(event);
      event.start.setFullYear(1999);

      expect(event.start.getTime()).not.toBe(originalStartTime); // sanity: the mutation itself really happened
      expect(store.events()[0].start.getTime()).toBe(originalStartTime);
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

    it('updateEvent throws CalendarValidationError when changes.end is an Invalid Date, leaving the event untouched', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z');
      store.addEvent(event);

      expect(() => store.updateEvent('1', { end: new Date('not-a-real-date') })).toThrow(
        CalendarValidationError,
      );
      expect(store.events()).toEqual([event]);
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

  describe('recurrence (real rrule expansion)', () => {
    it('expands a bounded recurring event into one entry per occurrence within range', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z', {
        recurrence: 'FREQ=DAILY;COUNT=5',
      });
      store.addEvent(event);

      const result = store.eventsInRange(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-06T00:00:00Z'));

      expect(result().map((occurrence) => occurrence.start.toISOString())).toEqual([
        '2026-09-01T09:00:00.000Z',
        '2026-09-02T09:00:00.000Z',
        '2026-09-03T09:00:00.000Z',
        '2026-09-04T09:00:00.000Z',
        '2026-09-05T09:00:00.000Z',
      ]);
    });

    it('addEvent throws CalendarValidationError for an invalid recurrence string, never saving it', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z', {
        recurrence: 'this is not a real rrule',
      });

      expect(() => store.addEvent(event)).toThrow(CalendarValidationError);
      expect(store.events()).toEqual([]);
    });

    it(
      'does not hang on an unbounded recurrence, and only returns occurrences within the queried range',
      () => {
        const store = new CalendarStore();
        const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z', {
          recurrence: 'FREQ=DAILY', // no COUNT, no UNTIL: infinite.
        });
        store.addEvent(event);

        const startedAt = Date.now();
        const result = store.eventsInRange(new Date('2030-01-01T00:00:00Z'), new Date('2030-01-05T00:00:00Z'))();
        const elapsedMs = Date.now() - startedAt;

        expect(elapsedMs).toBeLessThan(1000);
        expect(result).toHaveLength(4);
        expect(result.every((occurrence) => occurrence.id === '1')).toBe(true);
      },
      5000,
    );

    it('includes a recurring occurrence that starts before the range but overlaps it via duration', () => {
      const store = new CalendarStore();
      // Each occurrence is 2 hours long, starting at 23:00 daily.
      const event = buildEvent('1', '2026-09-01T23:00:00Z', '2026-09-02T01:00:00Z', {
        recurrence: 'FREQ=DAILY;COUNT=3',
      });
      store.addEvent(event);

      // The day-1 occurrence (23:00 day 1 -> 01:00 day 2) starts before
      // this range, but its own duration carries it past midnight, so it
      // must still be included.
      const result = store.eventsInRange(new Date('2026-09-02T00:00:00Z'), new Date('2026-09-02T00:30:00Z'));

      expect(result()).toHaveLength(1);
      expect(result()[0].start.toISOString()).toBe('2026-09-01T23:00:00.000Z');
    });

    it('findConflicts detects a conflict against a future occurrence of an existing recurring event', () => {
      const store = new CalendarStore();
      const recurring = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z', {
        recurrence: 'FREQ=DAILY;COUNT=5',
      });
      store.addEvent(recurring);

      // Overlaps the 3rd occurrence (2026-09-03), not the first.
      const candidate = buildEvent('2', '2026-09-03T09:30:00Z', '2026-09-03T10:30:00Z');

      const conflicts = store.findConflicts(candidate)();

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('1');
      expect(conflicts[0].start.toISOString()).toBe('2026-09-03T09:00:00.000Z');
    });

    it('occurrences expanded from the same recurring event share its id', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z', {
        recurrence: 'FREQ=DAILY;COUNT=3',
      });
      store.addEvent(event);

      const result = store.eventsInRange(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-04T00:00:00Z'));

      expect(result()).toHaveLength(3);
      expect(new Set(result().map((occurrence) => occurrence.id))).toEqual(new Set(['1']));
    });

    it(
      'caps a high-frequency unbounded recurrence at MAX_OCCURRENCES_PER_EXPANSION (1000) and warns',
      () => {
        const store = new CalendarStore();
        const event = buildEvent('1', '2026-09-01T00:00:00Z', '2026-09-01T00:00:01Z', {
          recurrence: 'FREQ=SECONDLY', // no COUNT/UNTIL: one occurrence per second, forever.
        });
        store.addEvent(event);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        const startedAt = Date.now();
        // A full day at one occurrence per second is 86400 candidates,
        // far past the 1000 cap.
        const result = store.eventsInRange(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-02T00:00:00Z'))();
        const elapsedMs = Date.now() - startedAt;

        expect(elapsedMs).toBeLessThan(1000);
        expect(result).toHaveLength(1000);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain('"1"');

        warnSpy.mockRestore();
      },
      5000,
    );

    it('does not warn for a recurring event well under the occurrence cap', () => {
      const store = new CalendarStore();
      const event = buildEvent('1', '2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z', {
        recurrence: 'FREQ=DAILY;COUNT=5',
      });
      store.addEvent(event);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const result = store.eventsInRange(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-10T00:00:00Z'));

      expect(result()).toHaveLength(5);
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
