import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUTH_ERROR_CODES, AUTH_SERVICE, AuthServiceError } from '@zhunam/auth';
import { SupabaseAuthStorage } from './models/supabase-auth-config';
import { provideSupabaseAuth } from './provide-supabase-auth';

// Runs against the real supabase-js client (no createClient mock), with
// only the network stubbed, so these tests catch how the SDK itself
// treats an async storage adapter, not how a mock was told to behave.

const STORAGE_KEY = 'test-session';

function sessionBody(accessToken: string) {
  return {
    access_token: accessToken,
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: 'uid-1',
      aud: 'authenticated',
      email: 'user@example.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function createAsyncStorage(): SupabaseAuthStorage & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: async (key) => entries.get(key) ?? null,
    setItem: async (key, value) => {
      entries.set(key, value);
    },
    removeItem: async (key) => {
      entries.delete(key);
    },
  };
}

function setUp(storage: SupabaseAuthStorage) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideSupabaseAuth({
        url: 'https://project.supabase.co',
        anonKey: 'anon-key',
        auth: { storage, storageKey: STORAGE_KEY, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    ],
  });
  return TestBed.inject(AUTH_SERVICE);
}

describe('provideSupabaseAuth with a custom async storage (real supabase-js client)', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves the session through the adapter on signIn and reads the token back from it', async () => {
    const storage = createAsyncStorage();
    const authService = setUp(storage);
    fetchMock.mockResolvedValue(jsonResponse(200, sessionBody('token-from-sign-in')));

    await authService.signIn('user@example.com', 'password');

    expect(storage.entries.get(STORAGE_KEY)).toContain('token-from-sign-in');
    expect(await authService.getIdToken()).toBe('token-from-sign-in');
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('restores an existing session from the adapter on startup', async () => {
    const storage = createAsyncStorage();
    storage.entries.set(STORAGE_KEY, JSON.stringify(sessionBody('persisted-token')));

    const authService = setUp(storage);

    expect(await authService.getIdToken()).toBe('persisted-token');
    await vi.waitFor(() => expect(authService.currentUser()?.uid).toBe('uid-1'));
  });

  it('rejects signIn with a normalized AuthServiceError when setItem fails', async () => {
    const storageError = new Error('safeStorage unavailable');
    const storage = { ...createAsyncStorage(), setItem: vi.fn().mockRejectedValue(storageError) };
    const authService = setUp(storage);
    fetchMock.mockResolvedValue(jsonResponse(200, sessionBody('token-from-sign-in')));

    const rejection = authService.signIn('user@example.com', 'password');

    await expect(rejection).rejects.toBeInstanceOf(AuthServiceError);
    await expect(rejection).rejects.toMatchObject({ code: AUTH_ERROR_CODES.unknown, cause: storageError });
  });

  // getItem only starts failing after startup on purpose: a rejection
  // during supabase-js's own startup read happens inside a promise the
  // SDK never awaits (onAuthStateChange's INITIAL_SESSION emit), out of
  // this library's reach. The README tells adapters to resolve null on a
  // failed read for that reason.
  it('rejects getIdToken with a normalized AuthServiceError when getItem fails, and stays signed out', async () => {
    const storageError = new Error('IPC channel closed');
    const workingStorage = createAsyncStorage();
    let failReads = false;
    const storage = {
      ...workingStorage,
      getItem: (key: string) => (failReads ? Promise.reject(storageError) : workingStorage.getItem(key)),
    };
    const authService = setUp(storage);
    expect(await authService.getIdToken()).toBeNull();
    failReads = true;

    await expect(authService.getIdToken()).rejects.toMatchObject({ code: AUTH_ERROR_CODES.unknown, cause: storageError });
    expect(authService.currentUser()).toBeNull();
  });

  it('removeItem failing on signOut rejects with a normalized AuthServiceError', async () => {
    const storageError = new Error('safeStorage unavailable');
    const storage = { ...createAsyncStorage(), removeItem: vi.fn().mockRejectedValue(storageError) };
    const authService = setUp(storage);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, sessionBody('token-from-sign-in')));
    await authService.signIn('user@example.com', 'password');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(authService.signOut()).rejects.toMatchObject({ code: AUTH_ERROR_CODES.unknown, cause: storageError });
  });

  it('verifyResetCode maps the server rejection of a wrong or expired code to invalidActionCode', async () => {
    const authService = setUp(createAsyncStorage());
    fetchMock.mockResolvedValue(
      jsonResponse(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' }),
    );

    await expect(authService.verifyResetCode?.('000000', 'user@example.com')).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.invalidActionCode,
    });
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('verifyResetCode stores the recovery session through the adapter and signs the user in', async () => {
    const storage = createAsyncStorage();
    const authService = setUp(storage);
    fetchMock.mockResolvedValue(jsonResponse(200, sessionBody('recovery-token')));

    await authService.verifyResetCode?.('123456', 'user@example.com');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/auth/v1/verify');
    expect(JSON.parse(String(init?.body))).toMatchObject({ email: 'user@example.com', token: '123456', type: 'recovery' });
    expect(storage.entries.get(STORAGE_KEY)).toContain('recovery-token');
    await vi.waitFor(() => expect(authService.isAuthenticated()).toBe(true));
  });
});
