import { computed, NgZone, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { AuthService, AuthUser } from '@zhunam/auth';

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
  };
}

/**
 * `AuthService` implementation backed by Firebase Auth's modular SDK.
 *
 * Instantiated internally by `provideFirebaseAuth`, not part of this
 * entry point's public API. Consumers always interact with it through the
 * `AUTH_SERVICE` token, never by importing this class directly.
 */
export class FirebaseAuthService implements AuthService {
  private readonly userSignal = signal<AuthUser | null>(null);

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  constructor(
    private readonly auth: Auth,
    ngZone: NgZone,
  ) {
    onAuthStateChanged(auth, (user) => {
      // onAuthStateChanged runs outside Angular's zone, so updating the
      // signal here wouldn't otherwise trigger change detection — wrap it
      // so consumers bound to currentUser()/isAuthenticated() actually see
      // the update instead of going stale until an unrelated event happens
      // to re-enter the zone.
      ngZone.run(() => {
        this.userSignal.set(user ? toAuthUser(user) : null);
      });
    });
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return toAuthUser(credential.user);
  }

  async signUp(email: string, password: string): Promise<AuthUser> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    return toAuthUser(credential.user);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    return user ? user.getIdToken() : null;
  }
}
