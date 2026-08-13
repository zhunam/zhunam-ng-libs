import { NgZone, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { SupabaseAuthService } from './supabase-auth.service';

function createSupabaseUser(overrides: Partial<User> = {}): User {
  return {
    id: 'uid-1',
    email: 'user@example.com',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    user_metadata: { full_name: 'Test User' },
    // Supabase-only fields that must NOT leak into the mapped AuthUser.
    aud: 'authenticated',
    app_metadata: { provider: 'email' },
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as unknown as User;
}

function createSession(user: User, accessToken = 'access-token-123'): Session {
  return { access_token: accessToken, user } as unknown as Session;
}

function createFakeClient() {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  } as unknown as SupabaseClient;
}

describe('SupabaseAuthService', () => {
  let fakeClient: ReturnType<typeof createFakeClient>;
  let authStateCallback: (event: AuthChangeEvent, session: Session | null) => void;

  beforeEach(() => {
    fakeClient = createFakeClient();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    (fakeClient.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockImplementation(
      (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    );
  });

  function createService(): SupabaseAuthService {
    return new SupabaseAuthService(fakeClient, TestBed.inject(NgZone));
  }

  it('reflects the user emitted by onAuthStateChange in currentUser', () => {
    const service = createService();
    const user = createSupabaseUser();

    authStateCallback('SIGNED_IN', createSession(user));

    expect(service.currentUser()).toEqual({
      uid: 'uid-1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'Test User',
    });
  });

  it('isAuthenticated is false with no session and true once one is set', () => {
    const service = createService();
    expect(service.isAuthenticated()).toBe(false);

    authStateCallback('SIGNED_IN', createSession(createSupabaseUser()));
    expect(service.isAuthenticated()).toBe(true);
  });

  it('goes back to unauthenticated when onAuthStateChange emits a null session (sign-out)', () => {
    const service = createService();
    authStateCallback('SIGNED_IN', createSession(createSupabaseUser()));
    expect(service.isAuthenticated()).toBe(true);

    authStateCallback('SIGNED_OUT', null);

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('maps emailVerified to false when email_confirmed_at is absent', () => {
    const service = createService();
    const user = createSupabaseUser({ email_confirmed_at: undefined });

    authStateCallback('SIGNED_IN', createSession(user));

    expect(service.currentUser()?.emailVerified).toBe(false);
  });

  it('maps displayName to null when user_metadata has no full_name or name', () => {
    const service = createService();
    const user = createSupabaseUser({ user_metadata: {} });

    authStateCallback('SIGNED_IN', createSession(user));

    expect(service.currentUser()?.displayName).toBeNull();
  });

  it('signIn calls signInWithPassword with the given credentials and maps only the 4 AuthUser fields', async () => {
    const service = createService();
    const user = createSupabaseUser();
    (fakeClient.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user, session: createSession(user) },
      error: null,
    });

    const result = await service.signIn('user@example.com', 'secret');

    expect(fakeClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret',
    });
    expect(result).toEqual({
      uid: 'uid-1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'Test User',
    });
    expect(Object.keys(result)).toEqual(['uid', 'email', 'emailVerified', 'displayName']);
  });

  it('propagates a Supabase error from signIn as-is, without translating it', async () => {
    const service = createService();
    const supabaseError = { name: 'AuthApiError', message: 'Invalid login credentials', status: 400 };
    (fakeClient.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null, session: null },
      error: supabaseError,
    });

    await expect(service.signIn('user@example.com', 'wrong')).rejects.toBe(supabaseError);
  });

  it('signUp calls signUp with the given credentials and maps only the 4 AuthUser fields', async () => {
    const service = createService();
    const user = createSupabaseUser();
    (fakeClient.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user, session: createSession(user) },
      error: null,
    });

    const result = await service.signUp('new@example.com', 'secret');

    expect(fakeClient.auth.signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'secret' });
    expect(result).toEqual({
      uid: 'uid-1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'Test User',
    });
  });

  it('signUp throws when Supabase returns no user despite no error', async () => {
    const service = createService();
    (fakeClient.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    await expect(service.signUp('new@example.com', 'secret')).rejects.toThrow(
      'Supabase signUp() did not return a user.',
    );
  });

  it('propagates a Supabase error from signUp as-is, without translating it', async () => {
    const service = createService();
    const supabaseError = { name: 'AuthApiError', message: 'User already registered', status: 422 };
    (fakeClient.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null, session: null },
      error: supabaseError,
    });

    await expect(service.signUp('user@example.com', 'secret')).rejects.toBe(supabaseError);
  });

  it('signOut resolves when Supabase reports no error', async () => {
    const service = createService();
    (fakeClient.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    await expect(service.signOut()).resolves.toBeUndefined();
  });

  it('signOut calls Supabase signOut and propagates its error as-is', async () => {
    const service = createService();
    const supabaseError = { name: 'AuthApiError', message: 'Network error', status: 500 };
    (fakeClient.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: supabaseError });

    await expect(service.signOut()).rejects.toBe(supabaseError);
    expect(fakeClient.auth.signOut).toHaveBeenCalled();
  });

  it('resetPassword calls resetPasswordForEmail with the given email', async () => {
    const service = createService();
    (fakeClient.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    await service.resetPassword('user@example.com');

    expect(fakeClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
  });

  it('resetPassword propagates a Supabase error as-is', async () => {
    const service = createService();
    const supabaseError = { name: 'AuthApiError', message: 'Email rate limit exceeded', status: 429 };
    (fakeClient.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ error: supabaseError });

    await expect(service.resetPassword('user@example.com')).rejects.toBe(supabaseError);
  });

  it('getIdToken returns null when there is no active session', async () => {
    const service = createService();
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(service.getIdToken()).resolves.toBeNull();
  });

  it('getIdToken returns the session access_token when a session exists', async () => {
    const service = createService();
    const user = createSupabaseUser();
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: createSession(user, 'access-token-xyz') },
      error: null,
    });

    await expect(service.getIdToken()).resolves.toBe('access-token-xyz');
  });

  it('getIdToken propagates a Supabase error as-is', async () => {
    const service = createService();
    const supabaseError = { name: 'AuthApiError', message: 'Session expired', status: 401 };
    (fakeClient.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: supabaseError,
    });

    await expect(service.getIdToken()).rejects.toBe(supabaseError);
  });

  it('maps email to null when the Supabase user has no email', () => {
    const service = createService();
    const user = createSupabaseUser({ email: undefined });

    authStateCallback('SIGNED_IN', createSession(user));

    expect(service.currentUser()?.email).toBeNull();
  });
});
