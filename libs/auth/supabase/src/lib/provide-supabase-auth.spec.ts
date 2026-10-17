import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUTH_SERVICE } from '@zhunam/auth';
import { provideSupabaseAuth } from './provide-supabase-auth';

const { createClientMock, onAuthStateChangeMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

describe('provideSupabaseAuth', () => {
  const config = { url: 'https://app.supabase.co', anonKey: 'anon-key' };
  const fakeClient = { auth: { onAuthStateChange: onAuthStateChangeMock } };

  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockReturnValue(fakeClient);
    onAuthStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('creates the Supabase client with the given config and registers an AuthService under AUTH_SERVICE', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideSupabaseAuth(config)],
    });

    const authService = TestBed.inject(AUTH_SERVICE);

    expect(createClientMock).toHaveBeenCalledWith(config.url, config.anonKey);
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('without auth options, calls createClient with exactly url and anonKey, as in 3.1.0', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideSupabaseAuth(config)],
    });

    TestBed.inject(AUTH_SERVICE);

    expect(createClientMock.mock.calls[0]).toEqual([config.url, config.anonKey]);
  });

  it('forwards auth options, including an async storage adapter, to createClient as-is', () => {
    const storage = {
      getItem: vi.fn(async () => null),
      setItem: vi.fn(async () => undefined),
      removeItem: vi.fn(async () => undefined),
    };
    const auth = {
      storage,
      storageKey: 'heflex-session',
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce' as const,
    };
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideSupabaseAuth({ ...config, auth })],
    });

    TestBed.inject(AUTH_SERVICE);

    expect(createClientMock).toHaveBeenCalledWith(config.url, config.anonKey, { auth });
    expect(createClientMock.mock.calls[0][2].auth.storage).toBe(storage);
  });

  it('drops keys set to undefined, so they keep Supabase defaults instead of overriding them', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideSupabaseAuth({ ...config, auth: { storageKey: 'heflex-session', persistSession: undefined } }),
      ],
    });

    TestBed.inject(AUTH_SERVICE);

    expect(createClientMock.mock.calls[0][2]).toEqual({ auth: { storageKey: 'heflex-session' } });
  });
});
