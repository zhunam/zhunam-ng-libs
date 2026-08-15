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
 */
export class MockAuthService implements AuthService {
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly registeredEmails = new Set<string>([DEMO_EMAIL]);

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  async signIn(email: string, password: string): Promise<AuthUser> {
    await this.simulateLatency();
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      this.userSignal.set(DEMO_USER);
      return DEMO_USER;
    }
    throw new Error('Invalid email or password.');
  }

  async signUp(email: string): Promise<AuthUser> {
    await this.simulateLatency();
    if (this.registeredEmails.has(email)) {
      throw new Error('This email is already in use.');
    }
    const user: AuthUser = {
      uid: `demo-user-${Date.now()}`,
      email,
      emailVerified: false,
      displayName: null,
    };
    this.registeredEmails.add(email);
    this.userSignal.set(user);
    return user;
  }

  async signOut(): Promise<void> {
    await this.simulateLatency();
    this.userSignal.set(null);
  }

  async resetPassword(email: string): Promise<void> {
    await this.simulateLatency();
    if (!this.registeredEmails.has(email)) {
      // Mirrors Firebase's real default behavior for a non-existent
      // email (see reset-password-form.ts in @zhunam/auth/form-ui) — the
      // component catches this exact code and shows the same success
      // message regardless, which is what this demo is meant to prove.
      throw Object.assign(new Error('There is no user record corresponding to this identifier.'), {
        code: 'auth/user-not-found',
      });
    }
  }

  async getIdToken(): Promise<string | null> {
    const user = this.userSignal();
    return user ? `demo-id-token-${user.uid}` : null;
  }

  private simulateLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 250));
  }
}
