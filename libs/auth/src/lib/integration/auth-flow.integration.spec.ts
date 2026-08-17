// Integration tests: exercise the real pieces of @zhunam/auth wired
// together exactly as a consumer would (authGuard + form-ui components +
// the real provideFirebaseAuth/provideSupabaseAuth provider factories).
// Only the external SDKs (firebase/app, firebase/auth,
// @supabase/supabase-js) are mocked — never AUTH_SERVICE itself, never
// any other piece of this library. The per-unit spec files next to each
// implementation already cover isolated behavior; this file is about the
// seams between pieces.
import { Provider, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from '../guards/auth-guard';
import { AuthService } from '../models/auth-service';
import { AuthUser } from '../models/auth-user';
import { AUTH_SERVICE } from '../tokens/auth-service.token';
import { FirebaseAuthConfig, provideFirebaseAuth } from '@zhunam/auth/firebase';
import { LoginForm, ResetPasswordForm } from '@zhunam/auth/form-ui';
import { SupabaseAuthConfig, provideSupabaseAuth } from '@zhunam/auth/supabase';

const {
  initializeAppMock,
  getAuthMock,
  onAuthStateChangedMock,
  signInWithEmailAndPasswordMock,
  firebaseSignOutMock,
  sendPasswordResetEmailMock,
} = vi.hoisted(() => ({
  initializeAppMock: vi.fn(),
  getAuthMock: vi.fn(),
  onAuthStateChangedMock: vi.fn(),
  signInWithEmailAndPasswordMock: vi.fn(),
  firebaseSignOutMock: vi.fn(),
  sendPasswordResetEmailMock: vi.fn(),
}));

vi.mock('firebase/app', () => ({ initializeApp: initializeAppMock }));
vi.mock('firebase/auth', () => ({
  getAuth: getAuthMock,
  onAuthStateChanged: onAuthStateChangedMock,
  signInWithEmailAndPassword: signInWithEmailAndPasswordMock,
  createUserWithEmailAndPassword: vi.fn(),
  signOut: firebaseSignOutMock,
  sendPasswordResetEmail: sendPasswordResetEmailMock,
}));

const {
  createClientMock,
  supabaseSignInWithPasswordMock,
  supabaseSignOutMock,
  supabaseResetPasswordForEmailMock,
  onAuthStateChangeMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  supabaseSignInWithPasswordMock: vi.fn(),
  supabaseSignOutMock: vi.fn(),
  supabaseResetPasswordForEmailMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

/**
 * Uniform test surface over each real provider factory, so the same suite
 * of assertions runs unmodified against both — that equivalence, not a
 * side-by-side comparison test, is what proves the two behave the same
 * way from the consumer's perspective.
 */
interface ProviderHarness {
  providers: Provider[];
  /** Simulates the provider's own listener firing with a (possibly null) user, as it would after a real sign-in/sign-out. */
  emitAuthState(user: AuthUser | null): void;
  mockSignInSuccess(user: AuthUser): void;
  mockSignInFailure(error: unknown): void;
  mockSignOutSuccess(): void;
  mockResetPasswordSuccess(): void;
  /** Configures the "account doesn't exist" case for resetPassword — provider-specific, see comment at each implementation. */
  mockResetPasswordUserNotFound(): void;
}

function createFirebaseHarness(): ProviderHarness {
  let authStateCallback: (user: unknown) => void;
  initializeAppMock.mockReturnValue({});
  getAuthMock.mockReturnValue({ currentUser: null });
  onAuthStateChangedMock.mockImplementation((_auth: unknown, callback: (user: unknown) => void) => {
    authStateCallback = callback;
    return vi.fn();
  });

  const config: FirebaseAuthConfig = { apiKey: 'key', authDomain: 'app.firebaseapp.com', projectId: 'app' };

  return {
    providers: provideFirebaseAuth(config),
    emitAuthState(user) {
      authStateCallback(
        user ? { uid: user.uid, email: user.email, emailVerified: user.emailVerified, displayName: user.displayName } : null,
      );
    },
    mockSignInSuccess(user) {
      signInWithEmailAndPasswordMock.mockResolvedValue({
        user: { uid: user.uid, email: user.email, emailVerified: user.emailVerified, displayName: user.displayName },
      });
    },
    mockSignInFailure(error) {
      signInWithEmailAndPasswordMock.mockRejectedValue(error);
    },
    mockSignOutSuccess() {
      firebaseSignOutMock.mockResolvedValue(undefined);
    },
    mockResetPasswordSuccess() {
      sendPasswordResetEmailMock.mockResolvedValue(undefined);
    },
    mockResetPasswordUserNotFound() {
      // Firebase throws this by default for a non-existent email (unless
      // "Email enumeration protection" is enabled project-side) — see the
      // security comment in reset-password-form.ts.
      sendPasswordResetEmailMock.mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'There is no user record corresponding to this identifier.',
      });
    },
  };
}

function createSupabaseHarness(): ProviderHarness {
  let authStateCallback: (event: string, session: unknown) => void;
  onAuthStateChangeMock.mockImplementation((callback: (event: string, session: unknown) => void) => {
    authStateCallback = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  createClientMock.mockReturnValue({
    auth: {
      signInWithPassword: supabaseSignInWithPasswordMock,
      signUp: vi.fn(),
      signOut: supabaseSignOutMock,
      resetPasswordForEmail: supabaseResetPasswordForEmailMock,
      getSession: vi.fn(),
      onAuthStateChange: onAuthStateChangeMock,
    },
  });

  const config: SupabaseAuthConfig = { url: 'https://app.supabase.co', anonKey: 'anon-key' };

  return {
    providers: provideSupabaseAuth(config),
    emitAuthState(user) {
      authStateCallback(
        user ? 'SIGNED_IN' : 'SIGNED_OUT',
        user
          ? { access_token: 'token', user: { id: user.uid, email: user.email, email_confirmed_at: user.emailVerified ? 'now' : undefined, user_metadata: { full_name: user.displayName } } }
          : null,
      );
    },
    mockSignInSuccess(user) {
      supabaseSignInWithPasswordMock.mockResolvedValue({
        data: {
          user: { id: user.uid, email: user.email, email_confirmed_at: user.emailVerified ? 'now' : undefined, user_metadata: { full_name: user.displayName } },
          session: { access_token: 'token' },
        },
        error: null,
      });
    },
    mockSignInFailure(error) {
      supabaseSignInWithPasswordMock.mockResolvedValue({ data: { user: null, session: null }, error });
    },
    mockSignOutSuccess() {
      supabaseSignOutMock.mockResolvedValue({ error: null });
    },
    mockResetPasswordSuccess() {
      supabaseResetPasswordForEmailMock.mockResolvedValue({ error: null });
    },
    mockResetPasswordUserNotFound() {
      // Supabase deliberately never reveals this — resetPasswordForEmail()
      // resolves without error whether the account exists or not. This
      // harness call is a no-op that mirrors that real behavior, kept so
      // the parametrized suite below can call it unconditionally for
      // either provider.
      supabaseResetPasswordForEmailMock.mockResolvedValue({ error: null });
    },
  };
}

const providers: [string, () => ProviderHarness][] = [
  ['firebase', createFirebaseHarness],
  ['supabase', createSupabaseHarness],
];

function runInjected<T>(fn: () => T): T {
  return TestBed.runInInjectionContext(fn);
}

function submitForm(fixture: ComponentFixture<unknown>, value: Record<string, string>): void {
  const formBuilderDebugEl = fixture.debugElement.query((de) => de.name === 'lib-form-builder');
  formBuilderDebugEl.triggerEventHandler('formSubmit', value);
  fixture.detectChanges();
}

// Under zoneless testing, fixture.whenStable() only tracks Angular-aware
// work (signals, effects, HTTP client, ...) — a plain promise chain from a
// mocked SDK call (our onSubmit → authService.method() → SDK function,
// three awaited layers here) isn't registered with it and can still be
// pending when whenStable() resolves. A macrotask boundary guarantees
// every already-queued microtask — including that chain — has drained
// first, which whenStable() alone doesn't.
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe.each(providers)('%s: login → authGuard integration flow', (_name, createHarness) => {
  let harness: ProviderHarness;

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createHarness();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), ...harness.providers],
    });
  });

  it('blocks a protected route while signed out, allows it after LoginForm signs in, and blocks it again after signOut', async () => {
    const protectedUrl = '/dashboard';
    const state = { url: protectedUrl } as RouterStateSnapshot;
    const route = {} as ActivatedRouteSnapshot;
    const user: AuthUser = { uid: 'uid-1', email: 'user@example.com', emailVerified: true, displayName: 'Test User' };

    // 1. Unauthenticated: authGuard redirects with the right query params.
    const redirect = runInjected(() => authGuard(route, state)) as UrlTree;
    expect(redirect).toBeInstanceOf(UrlTree);
    expect(redirect.queryParams['reason']).toBe('unauthenticated');
    expect(redirect.queryParams['returnUrl']).toBe(protectedUrl);

    // 2. Sign in through the real LoginForm component.
    harness.mockSignInSuccess(user);
    const loginFixture = TestBed.createComponent(LoginForm);
    loginFixture.detectChanges();
    submitForm(loginFixture, { email: user.email as string, password: 'secret' });
    await loginFixture.whenStable();
    await flushMicrotasks();
    // Simulates the provider's own listener firing after a real sign-in.
    harness.emitAuthState(user);

    const authService = TestBed.inject(AUTH_SERVICE);
    expect(authService.currentUser()).toEqual(user);

    const allowed = runInjected(() => authGuard(route, state));
    expect(allowed).toBe(true);

    // 3. Sign out: authGuard blocks the same route again.
    harness.mockSignOutSuccess();
    await authService.signOut();
    harness.emitAuthState(null);

    expect(authService.currentUser()).toBeNull();
    const blockedAgain = runInjected(() => authGuard(route, state)) as UrlTree;
    expect(blockedAgain).toBeInstanceOf(UrlTree);
    expect(blockedAgain.queryParams['reason']).toBe('unauthenticated');
  });
});

describe.each(providers)('%s: security invariants', (_name, createHarness) => {
  let harness: ProviderHarness;
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createHarness();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), ...harness.providers] });
    authService = TestBed.inject(AUTH_SERVICE);
  });

  it('never exposes a token/password/secret/credential field on the serialized AuthUser, and only the 4 known fields', async () => {
    const user: AuthUser = { uid: 'uid-1', email: 'user@example.com', emailVerified: true, displayName: 'Test User' };
    harness.mockSignInSuccess(user);
    await authService.signIn(user.email as string, 'secret');
    harness.emitAuthState(user);

    const serialized = JSON.stringify(authService.currentUser());
    expect(serialized).not.toMatch(/token|password|secret|credential|apikey|anonkey/i);
    expect(Object.keys(authService.currentUser() as object).sort()).toEqual(['displayName', 'email', 'emailVerified', 'uid']);
  });

  it('never leaks the ID token through currentUser or isAuthenticated — only getIdToken() exposes it', async () => {
    const user: AuthUser = { uid: 'uid-1', email: 'user@example.com', emailVerified: true, displayName: null };
    harness.mockSignInSuccess(user);
    await authService.signIn(user.email as string, 'secret');
    harness.emitAuthState(user);

    expect('getIdToken' in (authService.currentUser() as object)).toBe(false);
    expect(typeof authService.isAuthenticated()).toBe('boolean');
    expect(typeof authService.getIdToken).toBe('function');
  });

  it('leaves currentUser null after a failed sign-in, never a partial user', async () => {
    harness.mockSignInFailure(new Error('Invalid login credentials'));

    await expect(authService.signIn('user@example.com', 'wrong')).rejects.toThrow();

    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('signOut() does not throw when there is no active session', async () => {
    harness.mockSignOutSuccess();

    await expect(authService.signOut()).resolves.toBeUndefined();
  });
});

describe.each(providers)('%s: ResetPasswordForm integration', (_name, createHarness) => {
  let harness: ProviderHarness;

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createHarness();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), ...harness.providers] });
  });

  it('shows the identical generic success message whether the account exists or not', async () => {
    const fixture = TestBed.createComponent(ResetPasswordForm);
    fixture.detectChanges();
    const successText = () => (fixture.nativeElement as HTMLElement).querySelector('.auth-success')?.textContent?.trim() ?? null;

    harness.mockResetPasswordSuccess();
    submitForm(fixture, { email: 'existing@example.com' });
    await fixture.whenStable();
    await flushMicrotasks();
    fixture.detectChanges();
    const existingMessage = successText();

    harness.mockResetPasswordUserNotFound();
    submitForm(fixture, { email: 'missing@example.com' });
    await fixture.whenStable();
    await flushMicrotasks();
    fixture.detectChanges();
    const missingMessage = successText();

    expect(existingMessage).not.toBeNull();
    expect(existingMessage).toBe(missingMessage);
  });
});
