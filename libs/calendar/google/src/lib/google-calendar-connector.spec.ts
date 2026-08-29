import { TestBed } from '@angular/core/testing';
import { CalendarValidationError } from '@zhunam/calendar';
import { GoogleApiError } from './google-api-error';
import { GoogleCalendarConnector } from './google-calendar-connector';

/**
 * A real end-to-end OAuth exchange needs a registered Google Cloud
 * Client ID and real user interaction with Google's consent popup,
 * neither reproducible in an automated test. What's stubbed here is only
 * `window.google.accounts.oauth2` (the real script's global surface,
 * shape confirmed against a live, unmocked load of
 * https://accounts.google.com/gsi/client during this task, see
 * CLAUDE.md), so every test below exercises this connector's OWN state
 * logic (promise resolution, `isConnected`, `disconnect()`'s revoke
 * call) against a controlled fake, not a claim that Google's real popup
 * flow itself is under test.
 */
function stubGoogleIdentityServices() {
  let capturedConfig: google.accounts.oauth2.TokenClientConfig | null = null;
  const requestAccessToken = vi.fn();
  const initTokenClient = vi.fn((config: google.accounts.oauth2.TokenClientConfig) => {
    capturedConfig = config;
    return { requestAccessToken };
  });
  const revoke = vi.fn();

  vi.stubGlobal('google', { accounts: { oauth2: { initTokenClient, revoke } } });

  return {
    initTokenClient,
    requestAccessToken,
    revoke,
    getConfig: (): google.accounts.oauth2.TokenClientConfig => {
      if (!capturedConfig) {
        throw new Error('initTokenClient() was not called yet.');
      }
      return capturedConfig;
    },
  };
}

function createConnector(): GoogleCalendarConnector {
  return TestBed.runInInjectionContext(() => new GoogleCalendarConnector());
}

async function createConnectedConnector(): Promise<GoogleCalendarConnector> {
  const stub = stubGoogleIdentityServices();
  stub.requestAccessToken.mockImplementation(() => {
    stub.getConfig().callback({
      access_token: 'fake-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      token_type: 'Bearer',
    });
  });
  const connector = createConnector();
  await connector.connect('fake-client-id');
  return connector;
}

/**
 * Shape confirmed against the real Google Calendar API v3 reference
 * (events list/get/insert/patch response envelopes and Event resource),
 * not invented.
 */
function fakeFetchResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('GoogleCalendarConnector', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('connect()', () => {
    it('resolves and sets isConnected(true) on a successful token response', async () => {
      const stub = stubGoogleIdentityServices();
      stub.requestAccessToken.mockImplementation(() => {
        stub.getConfig().callback({
          access_token: 'fake-token',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          token_type: 'Bearer',
        });
      });

      const connector = createConnector();
      expect(connector.isConnected()).toBe(false);

      await connector.connect('fake-client-id');

      expect(connector.isConnected()).toBe(true);
      expect(stub.initTokenClient).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'fake-client-id',
          scope: 'https://www.googleapis.com/auth/calendar.events',
        }),
      );
    });

    it('rejects and keeps isConnected(false) when the token response carries an OAuth error', async () => {
      const stub = stubGoogleIdentityServices();
      stub.requestAccessToken.mockImplementation(() => {
        stub.getConfig().callback({
          access_token: '',
          expires_in: 0,
          scope: '',
          token_type: '',
          error: 'access_denied',
          error_description: 'User denied consent.',
        });
      });

      const connector = createConnector();

      await expect(connector.connect('fake-client-id')).rejects.toThrow(/access_denied/);
      expect(connector.isConnected()).toBe(false);
    });

    it('rejects and keeps isConnected(false) when the popup itself fails (error_callback)', async () => {
      const stub = stubGoogleIdentityServices();
      stub.requestAccessToken.mockImplementation(() => {
        stub.getConfig().error_callback?.({ type: 'popup_closed' });
      });

      const connector = createConnector();

      await expect(connector.connect('fake-client-id')).rejects.toThrow(/popup_closed/);
      expect(connector.isConnected()).toBe(false);
    });

    it('never exposes the access token on any public property or method', async () => {
      const stub = stubGoogleIdentityServices();
      stub.requestAccessToken.mockImplementation(() => {
        stub.getConfig().callback({
          access_token: 'super-secret-token',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          token_type: 'Bearer',
        });
      });

      const connector = createConnector();
      await connector.connect('fake-client-id');

      // This test caught a real bug during development: an earlier
      // version stored the token as `private accessToken` (TypeScript's
      // keyword, compile-time only), and JSON.stringify()/Object.keys()
      // both genuinely included it, TypeScript's `private` has no
      // runtime effect. Reflect.ownKeys() is the strongest of the three,
      // it would reveal even a non-enumerable own property; a real `#`
      // private field is invisible to all of them, which is what the
      // implementation actually uses now.
      expect(JSON.stringify(connector)).not.toContain('super-secret-token');
      expect(Object.keys(connector)).not.toContain('accessToken');
      expect(Reflect.ownKeys(connector)).not.toContain('accessToken');
    });
  });

  describe('disconnect()', () => {
    async function connectThenGetStub() {
      const stub = stubGoogleIdentityServices();
      stub.requestAccessToken.mockImplementation(() => {
        stub.getConfig().callback({
          access_token: 'fake-token',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/calendar.events',
          token_type: 'Bearer',
        });
      });
      const connector = createConnector();
      await connector.connect('fake-client-id');
      return { connector, stub };
    }

    it('sets isConnected(false) synchronously and calls revoke() with the held token', async () => {
      const { connector, stub } = await connectThenGetStub();

      connector.disconnect();

      expect(connector.isConnected()).toBe(false);
      expect(stub.revoke).toHaveBeenCalledWith('fake-token', expect.any(Function));
    });

    it('warns on the console if revoke() reports failure, without throwing', async () => {
      const { connector, stub } = await connectThenGetStub();
      stub.revoke.mockImplementation((_token: string, done: (r: { successful: boolean; error?: string }) => void) => {
        done({ successful: false, error: 'invalid_token' });
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      expect(() => connector.disconnect()).not.toThrow();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('invalid_token');
      warnSpy.mockRestore();
    });

    it('is a no-op on revoke() when never connected', () => {
      const stub = stubGoogleIdentityServices();
      const connector = createConnector();

      expect(() => connector.disconnect()).not.toThrow();
      expect(connector.isConnected()).toBe(false);
      expect(stub.revoke).not.toHaveBeenCalled();
    });
  });

  describe('listEvents()', () => {
    const range = { start: new Date('2026-09-01T00:00:00Z'), end: new Date('2026-09-30T00:00:00Z') };

    it('rejects without calling fetch when not connected', async () => {
      const connector = createConnector();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(connector.listEvents(range)).rejects.toThrow(/connect/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('maps a normal timed event', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          fakeFetchResponse(200, {
            items: [
              {
                id: 'evt-1',
                summary: 'Standup',
                start: { dateTime: '2026-09-01T09:00:00-05:00' },
                end: { dateTime: '2026-09-01T09:30:00-05:00' },
              },
            ],
          }),
        ),
      );

      const events = await connector.listEvents(range);

      expect(events).toEqual([
        {
          id: 'evt-1',
          title: 'Standup',
          start: new Date('2026-09-01T09:00:00-05:00'),
          end: new Date('2026-09-01T09:30:00-05:00'),
          allDay: false,
        },
      ]);
    });

    it('maps an all-day event with allDay: true and the correct calendar date', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          fakeFetchResponse(200, {
            items: [
              {
                id: 'evt-2',
                summary: 'Company holiday',
                start: { date: '2026-09-05' },
                end: { date: '2026-09-06' },
              },
            ],
          }),
        ),
      );

      const [event] = await connector.listEvents(range);

      expect(event.allDay).toBe(true);
      expect(event.start.toISOString()).toBe('2026-09-05T00:00:00.000Z');
      expect(event.end.toISOString()).toBe('2026-09-06T00:00:00.000Z');
    });

    it('maps a single RRULE line to the plain recurrence string, not an array', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          fakeFetchResponse(200, {
            items: [
              {
                id: 'evt-3',
                summary: 'Weekly sync',
                start: { dateTime: '2026-09-01T09:00:00Z' },
                end: { dateTime: '2026-09-01T10:00:00Z' },
                recurrence: ['RRULE:FREQ=WEEKLY;COUNT=5'],
              },
            ],
          }),
        ),
      );

      const [event] = await connector.listEvents(range);

      expect(event.recurrence).toBe('RRULE:FREQ=WEEKLY;COUNT=5');
    });

    it('keeps only the RRULE line when recurrence has multiple lines (RRULE + EXDATE), without throwing', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          fakeFetchResponse(200, {
            items: [
              {
                id: 'evt-4',
                summary: 'Daily standup',
                start: { dateTime: '2026-09-01T09:00:00Z' },
                end: { dateTime: '2026-09-01T09:15:00Z' },
                recurrence: ['RRULE:FREQ=DAILY;COUNT=10', 'EXDATE:20260903T090000Z'],
              },
            ],
          }),
        ),
      );

      const events = await connector.listEvents(range);

      expect(events).toHaveLength(1);
      expect(events[0].recurrence).toBe('RRULE:FREQ=DAILY;COUNT=10');
    });

    it('throws GoogleApiError and clears isConnected() on a 401', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          fakeFetchResponse(401, {
            error: {
              errors: [{ domain: 'global', reason: 'authError', message: 'Invalid Credentials' }],
              code: 401,
              message: 'Invalid Credentials',
            },
          }),
        ),
      );

      await expect(connector.listEvents(range)).rejects.toThrow(GoogleApiError);
      expect(connector.isConnected()).toBe(false);
    });

    it('throws GoogleApiError on a 500 without clearing isConnected()', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          fakeFetchResponse(500, {
            error: { errors: [], code: 500, message: 'Internal error encountered.' },
          }),
        ),
      );

      await expect(connector.listEvents(range)).rejects.toThrow(GoogleApiError);
      expect(connector.isConnected()).toBe(true);
    });

    it('follows nextPageToken across multiple pages, without console.warn (limit not reached)', async () => {
      const connector = await createConnectedConnector();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          fakeFetchResponse(200, {
            items: [
              {
                id: 'evt-1',
                summary: 'Page 1 event',
                start: { dateTime: '2026-09-01T09:00:00Z' },
                end: { dateTime: '2026-09-01T10:00:00Z' },
              },
            ],
            nextPageToken: 'page-2',
          }),
        )
        .mockResolvedValueOnce(
          fakeFetchResponse(200, {
            items: [
              {
                id: 'evt-2',
                summary: 'Page 2 event',
                start: { dateTime: '2026-09-02T09:00:00Z' },
                end: { dateTime: '2026-09-02T10:00:00Z' },
              },
            ],
            nextPageToken: 'page-3',
          }),
        )
        .mockResolvedValueOnce(
          fakeFetchResponse(200, {
            items: [
              {
                id: 'evt-3',
                summary: 'Page 3 event',
                start: { dateTime: '2026-09-03T09:00:00Z' },
                end: { dateTime: '2026-09-03T10:00:00Z' },
              },
            ],
            // No nextPageToken: this is the last page.
          }),
        );
      vi.stubGlobal('fetch', fetchMock);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const events = await connector.listEvents(range);

      expect(events.map((event) => event.id)).toEqual(['evt-1', 'evt-2', 'evt-3']);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(warnSpy).not.toHaveBeenCalled();
      // The 2nd/3rd requests carry the pageToken the previous response returned.
      expect(fetchMock.mock.calls[1][0]).toContain('pageToken=page-2');
      expect(fetchMock.mock.calls[2][0]).toContain('pageToken=page-3');

      warnSpy.mockRestore();
    });

    it('stops at MAX_PAGES_PER_FETCH (4), returns what it accumulated, and warns exactly once', async () => {
      const connector = await createConnectedConnector();
      let callCount = 0;
      const fetchMock = vi.fn().mockImplementation(() => {
        callCount += 1;
        // Every page still carries a nextPageToken: simulates a calendar
        // loaded enough that pagination would otherwise never stop on
        // its own.
        return Promise.resolve(
          fakeFetchResponse(200, {
            items: [
              {
                id: `evt-${callCount}`,
                summary: `Event ${callCount}`,
                start: { dateTime: '2026-09-01T09:00:00Z' },
                end: { dateTime: '2026-09-01T10:00:00Z' },
              },
            ],
            nextPageToken: `page-${callCount + 1}`,
          }),
        );
      });
      vi.stubGlobal('fetch', fetchMock);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const events = await connector.listEvents(range);

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(events).toHaveLength(4);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('4');

      warnSpy.mockRestore();
    });
  });

  describe('createEvent()', () => {
    it('rejects without calling fetch when not connected', async () => {
      const connector = createConnector();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        connector.createEvent({
          title: 'Standup',
          start: new Date('2026-09-01T09:00:00Z'),
          end: new Date('2026-09-01T09:30:00Z'),
        }),
      ).rejects.toThrow(/connect/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects without calling fetch when the event is invalid (end before start)', async () => {
      const connector = await createConnectedConnector();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(
        connector.createEvent({
          title: 'Bad event',
          start: new Date('2026-09-01T10:00:00Z'),
          end: new Date('2026-09-01T09:00:00Z'),
        }),
      ).rejects.toThrow(CalendarValidationError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('creates a normal timed event and maps the response back', async () => {
      const connector = await createConnectedConnector();
      const fetchMock = vi.fn().mockResolvedValue(
        fakeFetchResponse(200, {
          id: 'new-evt-1',
          summary: 'Standup',
          start: { dateTime: '2026-09-01T09:00:00Z' },
          end: { dateTime: '2026-09-01T09:30:00Z' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await connector.createEvent({
        title: 'Standup',
        start: new Date('2026-09-01T09:00:00Z'),
        end: new Date('2026-09-01T09:30:00Z'),
      });

      expect(result).toEqual({
        id: 'new-evt-1',
        title: 'Standup',
        start: new Date('2026-09-01T09:00:00Z'),
        end: new Date('2026-09-01T09:30:00Z'),
        allDay: false,
        data: undefined,
      });
      expect(fetchMock.mock.calls[0][0]).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    });

    it('creates an all-day event with a correct date round trip (no timezone drift)', async () => {
      const connector = await createConnectedConnector();
      const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        const sentBody = JSON.parse(init.body as string);
        // Echoes back exactly what was sent, like a real API would.
        return Promise.resolve(fakeFetchResponse(200, { id: 'new-evt-2', summary: 'Holiday', ...sentBody }));
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await connector.createEvent({
        title: 'Holiday',
        start: new Date('2026-09-05T00:00:00Z'),
        end: new Date('2026-09-06T00:00:00Z'),
        allDay: true,
      });

      const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(sentBody.start).toEqual({ date: '2026-09-05' });
      expect(sentBody.end).toEqual({ date: '2026-09-06' });
      expect(result.allDay).toBe(true);
      expect(result.start.toISOString()).toBe('2026-09-05T00:00:00.000Z');
      expect(result.end.toISOString()).toBe('2026-09-06T00:00:00.000Z');
    });

    it('sends a single RRULE-prefixed recurrence line and maps it back to the plain string', async () => {
      const connector = await createConnectedConnector();
      const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        const sentBody = JSON.parse(init.body as string);
        return Promise.resolve(fakeFetchResponse(200, { id: 'new-evt-3', summary: 'Weekly sync', ...sentBody }));
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await connector.createEvent({
        title: 'Weekly sync',
        start: new Date('2026-09-01T09:00:00Z'),
        end: new Date('2026-09-01T10:00:00Z'),
        recurrence: 'FREQ=WEEKLY;COUNT=5',
      });

      const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(sentBody.recurrence).toEqual(['RRULE:FREQ=WEEKLY;COUNT=5']);
      expect(result.recurrence).toBe('RRULE:FREQ=WEEKLY;COUNT=5');
    });

    it('never sends data in the request body, but preserves it on the returned event', async () => {
      const connector = await createConnectedConnector();
      const fetchMock = vi.fn().mockResolvedValue(
        fakeFetchResponse(200, {
          id: 'new-evt-4',
          summary: 'With data',
          start: { dateTime: '2026-09-01T09:00:00Z' },
          end: { dateTime: '2026-09-01T10:00:00Z' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await connector.createEvent({
        title: 'With data',
        start: new Date('2026-09-01T09:00:00Z'),
        end: new Date('2026-09-01T10:00:00Z'),
        data: { appointmentId: 'secret-42' },
      });

      const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(sentBody).not.toHaveProperty('data');
      expect(JSON.stringify(sentBody)).not.toContain('secret-42');
      expect(result.data).toEqual({ appointmentId: 'secret-42' });
    });

    it('throws GoogleApiError and clears isConnected() on a 401', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(fakeFetchResponse(401, { error: { message: 'Invalid Credentials' } })),
      );

      await expect(
        connector.createEvent({
          title: 'X',
          start: new Date('2026-09-01T09:00:00Z'),
          end: new Date('2026-09-01T10:00:00Z'),
        }),
      ).rejects.toThrow(GoogleApiError);
      expect(connector.isConnected()).toBe(false);
    });

    it('throws GoogleApiError on a 500 without clearing isConnected()', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(fakeFetchResponse(500, { error: { message: 'Internal error.' } })),
      );

      await expect(
        connector.createEvent({
          title: 'X',
          start: new Date('2026-09-01T09:00:00Z'),
          end: new Date('2026-09-01T10:00:00Z'),
        }),
      ).rejects.toThrow(GoogleApiError);
      expect(connector.isConnected()).toBe(true);
    });
  });

  describe('updateEvent()', () => {
    it('rejects without calling fetch when not connected', async () => {
      const connector = createConnector();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(connector.updateEvent('evt-1', { title: 'New title' })).rejects.toThrow(/connect/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('updates via PATCH, sending only the changed field, with no extra GET', async () => {
      const connector = await createConnectedConnector();
      const fetchMock = vi.fn().mockResolvedValue(
        fakeFetchResponse(200, {
          id: 'evt-1',
          summary: 'Renamed',
          start: { dateTime: '2026-09-01T09:00:00Z' },
          end: { dateTime: '2026-09-01T10:00:00Z' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const result = await connector.updateEvent('evt-1', { title: 'Renamed' });

      expect(result.title).toBe('Renamed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events/evt-1',
      );
      expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
      const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(sentBody).toEqual({ summary: 'Renamed' });
    });

    it('fetches the current event first when only one of start/end changes, and validates the merged result', async () => {
      const connector = await createConnectedConnector();
      const fetchMock = vi
        .fn()
        // GET current event.
        .mockResolvedValueOnce(
          fakeFetchResponse(200, {
            id: 'evt-1',
            summary: 'Standup',
            start: { dateTime: '2026-09-01T09:00:00Z' },
            end: { dateTime: '2026-09-01T10:00:00Z' },
          }),
        )
        // PATCH.
        .mockResolvedValueOnce(
          fakeFetchResponse(200, {
            id: 'evt-1',
            summary: 'Standup',
            start: { dateTime: '2026-09-01T09:00:00Z' },
            end: { dateTime: '2026-09-01T11:00:00Z' },
          }),
        );
      vi.stubGlobal('fetch', fetchMock);

      const result = await connector.updateEvent('evt-1', { end: new Date('2026-09-01T11:00:00Z') });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events/evt-1',
      );
      expect(fetchMock.mock.calls[1][1].method).toBe('PATCH');
      const patchBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
      // Both start (from the fetched current event) and end (from changes)
      // are sent together, once the merged result is known to be valid.
      expect(patchBody.start).toEqual({ dateTime: '2026-09-01T09:00:00.000Z', timeZone: expect.any(String) });
      expect(patchBody.end).toEqual({ dateTime: '2026-09-01T11:00:00.000Z', timeZone: expect.any(String) });
      expect(result.end.toISOString()).toBe('2026-09-01T11:00:00.000Z');
    });

    it('rejects without ever PATCHing when the merged result of a partial change would be invalid', async () => {
      const connector = await createConnectedConnector();
      const fetchMock = vi.fn().mockResolvedValueOnce(
        fakeFetchResponse(200, {
          id: 'evt-1',
          summary: 'Standup',
          start: { dateTime: '2026-09-01T09:00:00Z' },
          end: { dateTime: '2026-09-01T10:00:00Z' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      // Only changing start to something after the current (unchanged) end.
      await expect(connector.updateEvent('evt-1', { start: new Date('2026-09-01T11:00:00Z') })).rejects.toThrow(
        CalendarValidationError,
      );

      // Only the GET happened, the invalid merge never reached a PATCH.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws GoogleApiError and clears isConnected() on a 401 from the PATCH request', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(fakeFetchResponse(401, { error: { message: 'Invalid Credentials' } })),
      );

      await expect(connector.updateEvent('evt-1', { title: 'X' })).rejects.toThrow(GoogleApiError);
      expect(connector.isConnected()).toBe(false);
    });

    it('throws GoogleApiError on a 500 without clearing isConnected()', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(fakeFetchResponse(500, { error: { message: 'Internal error.' } })),
      );

      await expect(connector.updateEvent('evt-1', { title: 'X' })).rejects.toThrow(GoogleApiError);
      expect(connector.isConnected()).toBe(true);
    });
  });

  describe('deleteEvent()', () => {
    it('rejects without calling fetch when not connected', async () => {
      const connector = createConnector();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(connector.deleteEvent('evt-1')).rejects.toThrow(/connect/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('resolves on a successful delete', async () => {
      const connector = await createConnectedConnector();
      const fetchMock = vi.fn().mockResolvedValue(fakeFetchResponse(200, {}));
      vi.stubGlobal('fetch', fetchMock);

      await expect(connector.deleteEvent('evt-1')).resolves.toBeUndefined();
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events/evt-1',
      );
      expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
    });

    it('treats a 410 (already deleted) as a successful no-op, not an error', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(fakeFetchResponse(410, { error: { message: 'Resource has been deleted' } })),
      );

      await expect(connector.deleteEvent('evt-1')).resolves.toBeUndefined();
    });

    it('throws GoogleApiError on a 404 (id never existed), does not treat it as success', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeFetchResponse(404, { error: { message: 'Not Found' } })));

      await expect(connector.deleteEvent('evt-1')).rejects.toThrow(GoogleApiError);
    });

    it('throws GoogleApiError and clears isConnected() on a 401', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(fakeFetchResponse(401, { error: { message: 'Invalid Credentials' } })),
      );

      await expect(connector.deleteEvent('evt-1')).rejects.toThrow(GoogleApiError);
      expect(connector.isConnected()).toBe(false);
    });

    it('throws GoogleApiError on a 500 without clearing isConnected()', async () => {
      const connector = await createConnectedConnector();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(fakeFetchResponse(500, { error: { message: 'Internal error.' } })),
      );

      await expect(connector.deleteEvent('evt-1')).rejects.toThrow(GoogleApiError);
      expect(connector.isConnected()).toBe(true);
    });
  });
});
