import { TestBed } from '@angular/core/testing';
import { GoogleCalendarConnector } from './google-calendar-connector';
import { GoogleCalendarNotConnectedError } from './google-calendar-not-connected-error';

/**
 * End-to-end security suite against `GoogleCalendarConnector`'s full
 * public surface (`connect`/`disconnect`/`listEvents`/`createEvent`/
 * `updateEvent`/`deleteEvent` exercised together on one instance), not
 * isolated units, those already exist in
 * `google-calendar-connector.spec.ts`. Same real-exchange limitation
 * documented there applies here too: `window.google.accounts.oauth2`
 * is stubbed with the shape confirmed against the real script, a live
 * OAuth popup itself isn't reproducible in this environment.
 */
function stubGoogleIdentityServices() {
  let capturedConfig: google.accounts.oauth2.TokenClientConfig | null = null;
  const requestAccessToken = vi.fn();
  const initTokenClient = vi.fn((config: google.accounts.oauth2.TokenClientConfig) => {
    capturedConfig = config;
    return { requestAccessToken };
  });
  const revoke = vi.fn((_token: string, done: (response: { successful: boolean }) => void) => {
    done({ successful: true });
  });

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

/**
 * Deliberately distinctive so a substring match can't be a false
 * positive against some unrelated piece of the serialized instance.
 */
const REAL_TOKEN = 'super-secret-real-access-token-xyz-9f31';

async function connectWithToken(
  clientId = 'fake-client-id',
): Promise<{ connector: GoogleCalendarConnector; stub: ReturnType<typeof stubGoogleIdentityServices> }> {
  const stub = stubGoogleIdentityServices();
  stub.requestAccessToken.mockImplementation(() => {
    stub.getConfig().callback({
      access_token: REAL_TOKEN,
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      token_type: 'Bearer',
    });
  });
  const connector = createConnector();
  await connector.connect(clientId);
  return { connector, stub };
}

const RANGE = { start: new Date('2026-09-01T00:00:00Z'), end: new Date('2026-09-30T00:00:00Z') };
const NEW_EVENT = { title: 'X', start: new Date('2026-09-01T09:00:00Z'), end: new Date('2026-09-01T10:00:00Z') };

function stubSuccessfulFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'evt-1',
        summary: 'Event',
        start: { dateTime: '2026-09-01T09:00:00Z' },
        end: { dateTime: '2026-09-01T10:00:00Z' },
      }),
    }),
  );
}

describe('GoogleCalendarConnector security (end-to-end)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('the token never leaks from the full instance', () => {
    it('JSON.stringify(connector) never contains the token, after connect() and every CRUD method', async () => {
      const { connector } = await connectWithToken();
      stubSuccessfulFetch();

      await connector.listEvents(RANGE);
      await connector.createEvent(NEW_EVENT);
      await connector.updateEvent('evt-1', { title: 'Renamed' });
      await connector.deleteEvent('evt-1');

      expect(JSON.stringify(connector)).not.toContain(REAL_TOKEN);
    });

    it('Object.keys(connector) never includes a key whose value is the token', async () => {
      const { connector } = await connectWithToken();
      stubSuccessfulFetch();
      await connector.listEvents(RANGE);
      await connector.createEvent(NEW_EVENT);
      await connector.updateEvent('evt-1', { title: 'Renamed' });

      const record = connector as unknown as Record<string, unknown>;
      const leakingKeys = Object.keys(record).filter((key) => record[key] === REAL_TOKEN);

      expect(leakingKeys).toEqual([]);
    });

    it('Reflect.ownKeys(connector) never includes a key whose value is the token', async () => {
      const { connector } = await connectWithToken();
      stubSuccessfulFetch();
      await connector.listEvents(RANGE);
      await connector.createEvent(NEW_EVENT);
      await connector.updateEvent('evt-1', { title: 'Renamed' });

      const record = connector as unknown as Record<PropertyKey, unknown>;
      const leakingKeys = Reflect.ownKeys(connector).filter((key) => record[key] === REAL_TOKEN);

      expect(leakingKeys).toEqual([]);
    });
  });

  describe('disconnect() leaves state fully clean: every method rejects like never-connected', () => {
    async function connectThenDisconnect(): Promise<GoogleCalendarConnector> {
      const { connector } = await connectWithToken();
      connector.disconnect();
      return connector;
    }

    it('listEvents() rejects with GoogleCalendarNotConnectedError and never calls fetch', async () => {
      const connector = await connectThenDisconnect();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(connector.listEvents(RANGE)).rejects.toThrow(GoogleCalendarNotConnectedError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('createEvent() rejects with GoogleCalendarNotConnectedError and never calls fetch', async () => {
      const connector = await connectThenDisconnect();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(connector.createEvent(NEW_EVENT)).rejects.toThrow(GoogleCalendarNotConnectedError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('updateEvent() rejects with GoogleCalendarNotConnectedError and never calls fetch', async () => {
      const connector = await connectThenDisconnect();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(connector.updateEvent('evt-1', { title: 'Renamed' })).rejects.toThrow(
        GoogleCalendarNotConnectedError,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('deleteEvent() rejects with GoogleCalendarNotConnectedError and never calls fetch', async () => {
      const connector = await connectThenDisconnect();
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(connector.deleteEvent('evt-1')).rejects.toThrow(GoogleCalendarNotConnectedError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('requested scope, confirmed end-to-end', () => {
    it('connect() requests exactly the calendar.events scope, never the full calendar scope or anything extra', async () => {
      const { stub } = await connectWithToken();

      expect(stub.initTokenClient).toHaveBeenCalledTimes(1);
      expect(stub.getConfig().scope).toBe('https://www.googleapis.com/auth/calendar.events');
      // Explicit negatives: the broader scope, and a made-up "everything"
      // scope, are the two most likely accidental over-asks.
      expect(stub.getConfig().scope).not.toBe('https://www.googleapis.com/auth/calendar');
      expect(stub.getConfig().scope.split(' ')).toHaveLength(1);
    });
  });

  describe('Client ID is not treated as a secret (deliberate, not an oversight of the token rule above)', () => {
    it('flows to initTokenClient() in plain text, unlike the token which is never reflectable off the instance', async () => {
      const clientId = 'my-public-client-id.apps.googleusercontent.com';
      const { stub } = await connectWithToken(clientId);

      // The Client ID is public information (Google's own docs: it
      // identifies the app, it doesn't authenticate as it), so it's
      // fine for it to appear anywhere, including here, passed to
      // Google's own library in plain text, with none of the
      // obfuscation this connector applies to a real secret above.
      expect(stub.getConfig().client_id).toBe(clientId);

      // There's nothing to check for "does it leak off the connector
      // instance" the way #accessToken does: GoogleCalendarConnector
      // never keeps the Client ID as an instance field once connect()
      // returns, it's only ever a local parameter passed straight
      // through. Its plain-text presence above, with no hiding
      // mechanism at all, is the actual point of this test: a Client
      // ID and an access token get deliberately different treatment,
      // this isn't the same rule applied inconsistently.
    });
  });
});
