import { computed, signal } from '@angular/core';
import { AuthService, AuthUser } from '@zhunam/auth';

export const DEMO_EMAIL = 'demo@demo.com';
export const DEMO_PASSWORD = 'demo1234';

const DEMO_USER: AuthUser = {
  uid: 'demo-user-1',
  email: DEMO_EMAIL,
  emailVerified: true,
  displayName: 'Demo User',
};

/** What actually changed `currentUser` — shown next to the Current state badge so it's obvious which form caused it. */
export type AuthStateSource = 'login' | 'register' | 'signout';

/** The literal outcome of one AuthService call, for the per-form result panels — same shape as what you'd console.log. */
export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * In-memory `AuthService` for the live demo — no Firebase/Supabase SDK,
 * no network call, no real credential ever touches this. Only the fixed
 * demo account (see DEMO_EMAIL/DEMO_PASSWORD) can sign in; signUp()
 * accepts anything else and keeps it in memory for this session only.
 *
 * This class never ships to consumers — it exists purely so this page
 * can wire the real LoginForm/RegisterForm/ResetPasswordForm from
 * @zhunam/auth/form-ui against a working AUTH_SERVICE without a real
 * backend.
 *
 * Beyond the `AuthService` contract, it also exposes `lastStateSource`
 * and the three `*Result` signals below — demo-only extras the real
 * library doesn't have. None of the form-ui components read these; only
 * this page does, since neither LoginForm, RegisterForm, nor
 * ResetPasswordForm expose an error/result output, and this is the one
 * place that actually knows the raw outcome of every call.
 */
export class MockAuthService implements AuthService {
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly registeredEmails = new Set<string>([DEMO_EMAIL]);

  private readonly lastStateSourceSignal = signal<AuthStateSource | null>(null);
  private readonly loginResultSignal = signal<ActionResult<AuthUser> | null>(null);
  private readonly registerResultSignal = signal<ActionResult<AuthUser> | null>(null);
  private readonly resetPasswordResultSignal = signal<ActionResult<void> | null>(null);

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  readonly lastStateSource = this.lastStateSourceSignal.asReadonly();
  readonly loginResult = this.loginResultSignal.asReadonly();
  readonly registerResult = this.registerResultSignal.asReadonly();
  readonly resetPasswordResult = this.resetPasswordResultSignal.asReadonly();

  async signIn(email: string, password: string): Promise<AuthUser> {
    this.loginResultSignal.set(null);
    await this.simulateLatency();
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      this.userSignal.set(DEMO_USER);
      this.lastStateSourceSignal.set('login');
      this.loginResultSignal.set({ ok: true, value: DEMO_USER });
      return DEMO_USER;
    }
    const message = 'Invalid email or password.';
    this.loginResultSignal.set({ ok: false, error: message });
    throw new Error(message);
  }

  async signUp(email: string): Promise<AuthUser> {
    this.registerResultSignal.set(null);
    await this.simulateLatency();
    if (this.registeredEmails.has(email)) {
      const message = 'This email is already in use.';
      this.registerResultSignal.set({ ok: false, error: message });
      throw new Error(message);
    }
    const user: AuthUser = {
      uid: `demo-user-${Date.now()}`,
      email,
      emailVerified: false,
      displayName: null,
    };
    this.registeredEmails.add(email);
    this.userSignal.set(user);
    this.lastStateSourceSignal.set('register');
    this.registerResultSignal.set({ ok: true, value: user });
    return user;
  }

  async signOut(): Promise<void> {
    await this.simulateLatency();
    this.userSignal.set(null);
    this.lastStateSourceSignal.set('signout');
  }

  async resetPassword(email: string): Promise<void> {
    this.resetPasswordResultSignal.set(null);
    await this.simulateLatency();
    if (!this.registeredEmails.has(email)) {
      // Mirrors Firebase's real default behavior for a non-existent
      // email (see reset-password-form.ts in @zhunam/auth/form-ui) — the
      // component catches this exact code and shows the same success
      // message regardless. The result panel deliberately shows this raw
      // rejection anyway, side by side with the form's identical-looking
      // success message — that contrast IS the demonstration.
      const message = 'There is no user record corresponding to this identifier.';
      this.resetPasswordResultSignal.set({ ok: false, error: message });
      throw Object.assign(new Error(message), { code: 'auth/user-not-found' });
    }
    this.resetPasswordResultSignal.set({ ok: true, value: undefined });
  }

  async getIdToken(): Promise<string | null> {
    const user = this.userSignal();
    return user ? `demo-id-token-${user.uid}` : null;
  }

  private simulateLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 250));
  }
}
