import { TestBed } from '@angular/core/testing';
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
});
