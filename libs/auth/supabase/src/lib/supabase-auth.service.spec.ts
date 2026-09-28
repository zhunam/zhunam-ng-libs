import { NgZone, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthWeakPasswordError,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import { AUTH_ERROR_CODES, AuthServiceError } from '@zhunam/auth';
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
      updateUser: vi.fn(),
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

  it('signOut resolves when Supabase reports no error', async () => {
    const service = createService();
    (fakeClient.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    await expect(service.signOut()).resolves.toBeUndefined();
  });

  it('resetPassword calls resetPasswordForEmail with the given email', async () => {
    const service = createService();
    (fakeClient.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

    await service.resetPassword('user@example.com');

    expect(fakeClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
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

  it('maps email to null when the Supabase user has no email', () => {
    const service = createService();
    const user = createSupabaseUser({ email: undefined });

    authStateCallback('SIGNED_IN', createSession(user));

    expect(service.currentUser()?.email).toBeNull();
  });

  describe('A1: normalized errors (AuthServiceError), using real Supabase error instances', () => {
    it.each([
      ['invalid_credentials', AUTH_ERROR_CODES.invalidCredential],
      ['user_already_exists', AUTH_ERROR_CODES.emailAlreadyInUse],
      ['email_exists', AUTH_ERROR_CODES.emailAlreadyInUse],
      ['over_request_rate_limit', AUTH_ERROR_CODES.tooManyRequests],
      ['over_email_send_rate_limit', AUTH_ERROR_CODES.tooManyRequests],
      ['email_address_invalid', AUTH_ERROR_CODES.invalidEmail],
    ])('AuthApiError with code %s maps to %s', async (supabaseCode, expectedCode) => {
      const service = createService();
      const supabaseError = new AuthApiError('Supabase message', 400, supabaseCode);
      (fakeClient.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null, session: null },
        error: supabaseError,
      });

      let rejected: unknown;
      try {
        await service.signIn('user@example.com', 'wrong');
      } catch (error) {
        rejected = error;
      }

      expect(rejected).toBeInstanceOf(AuthServiceError);
      expect((rejected as AuthServiceError).code).toBe(expectedCode);
      expect((rejected as AuthServiceError).message).toBe('Supabase message');
      expect((rejected as AuthServiceError).cause).toBe(supabaseError);
    });

    it('a real AuthWeakPasswordError maps to weakPassword', async () => {
      const service = createService();
      const supabaseError = new AuthWeakPasswordError('Password too weak', 422, ['length']);
      (fakeClient.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null, session: null },
        error: supabaseError,
      });

      await expect(service.signUp('user@example.com', 'weak')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.weakPassword,
        cause: supabaseError,
      });
    });

    it('a real AuthRetryableFetchError maps to networkRequestFailed', async () => {
      const service = createService();
      const supabaseError = new AuthRetryableFetchError('Failed to fetch', 0);
      (fakeClient.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null, session: null },
        error: supabaseError,
      });

      await expect(service.signIn('user@example.com', 'secret')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.networkRequestFailed,
        cause: supabaseError,
      });
    });

    it('an unrecognized error code maps to unknown', async () => {
      const service = createService();
      const supabaseError = new AuthApiError('Some other failure', 500, 'unexpected_failure');
      (fakeClient.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: supabaseError });

      await expect(service.signOut()).rejects.toMatchObject({ code: AUTH_ERROR_CODES.unknown });
    });
  });

  describe('A2: completePasswordReset', () => {
    it('calls updateUser with only the new password, code is not part of the call', async () => {
      const service = createService();
      (fakeClient.auth.updateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: createSupabaseUser() },
        error: null,
      });

      await service.completePasswordReset('new-password', 'some-firebase-style-code');

      expect(fakeClient.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
      expect(fakeClient.auth.updateUser).toHaveBeenCalledTimes(1);
    });

    it('maps a missing recovery session (AuthSessionMissingError) to invalidActionCode', async () => {
      const service = createService();
      const supabaseError = new AuthSessionMissingError();
      (fakeClient.auth.updateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: supabaseError,
      });

      await expect(service.completePasswordReset('new-password')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.invalidActionCode,
        cause: supabaseError,
      });
    });
  });

  describe('A3: signUp with a display name profile', () => {
    it('sends displayName as options.data.full_name, the same key toAuthUser() reads', async () => {
      const service = createService();
      const user = createSupabaseUser({ user_metadata: { full_name: 'Ada Lovelace' } });
      (fakeClient.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user, session: createSession(user) },
        error: null,
      });

      const result = await service.signUp('new@example.com', 'secret', { displayName: 'Ada Lovelace' });

      expect(fakeClient.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'secret',
        options: { data: { full_name: 'Ada Lovelace' } },
      });
      expect(result.displayName).toBe('Ada Lovelace');
    });

    it('without a profile, calls signUp with no options at all', async () => {
      const service = createService();
      const user = createSupabaseUser();
      (fakeClient.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user, session: createSession(user) },
        error: null,
      });

      await service.signUp('new@example.com', 'secret');

      expect(fakeClient.auth.signUp).toHaveBeenCalledWith({ email: 'new@example.com', password: 'secret' });
    });
  });

  describe('A4: signIn options', () => {
    it('ignores options.persistent entirely, calling signInWithPassword the same as without it', async () => {
      const service = createService();
      const user = createSupabaseUser();
      (fakeClient.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user, session: createSession(user) },
        error: null,
      });

      await service.signIn('user@example.com', 'secret', { persistent: true });

      expect(fakeClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret',
      });
    });
  });
});
