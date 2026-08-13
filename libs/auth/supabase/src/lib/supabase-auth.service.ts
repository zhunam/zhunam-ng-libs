import { computed, NgZone, signal } from '@angular/core';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { AuthService, AuthUser } from '@zhunam/auth';

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    // Supabase has no first-class "verified" flag — email_confirmed_at is
    // only set once the user confirms, so its presence *is* the signal.
    emailVerified: Boolean(user.email_confirmed_at),
    // Supabase has no first-class displayName field either: unlike
    // Firebase's User.displayName, any name lives in the free-form
    // user_metadata object, under whatever key the app chose when it
    // called signUp()/updateUser() (commonly "full_name" or "name", e.g.
    // via an OAuth provider). We check both common conventions and fall
    // back to null rather than guessing further.
    displayName: readMetadataString(user.user_metadata, 'full_name') ?? readMetadataString(user.user_metadata, 'name'),
  };
}

function readMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' ? value : null;
}

/**
 * `AuthService` implementation backed by Supabase Auth.
 *
 * Instantiated internally by `provideSupabaseAuth` — not part of this
 * entry point's public API. Consumers always interact with it through the
 * `AUTH_SERVICE` token, never by importing this class directly.
 */
export class SupabaseAuthService implements AuthService {
  private readonly userSignal = signal<AuthUser | null>(null);

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  constructor(
    private readonly client: SupabaseClient,
    ngZone: NgZone,
  ) {
    // Same-tab auth changes are notified via a zone-patched setTimeout, so
    // they'd already run inside Angular's zone when zone.js is loaded.
    // Cross-tab sync is different: Supabase broadcasts session changes to
    // other open tabs via BroadcastChannel, and zone.js does NOT patch
    // BroadcastChannel by default — so a session change made in another
    // tab would update this signal without triggering change detection
    // here. Wrapping unconditionally covers both cases and matches the
    // same defensive pattern used for Firebase.
    client.auth.onAuthStateChange((_event, session) => {
      ngZone.run(() => {
        this.userSignal.set(session ? toAuthUser(session.user) : null);
      });
    });
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return toAuthUser(data.user);
  }

  async signUp(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) {
      throw new Error('Supabase signUp() did not return a user.');
    }
    return toAuthUser(data.user);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  async getIdToken(): Promise<string | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return data.session?.access_token ?? null;
  }
}
