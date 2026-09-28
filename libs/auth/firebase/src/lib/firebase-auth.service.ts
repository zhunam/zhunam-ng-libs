import { computed, NgZone, signal } from '@angular/core';
import {
  Auth,
  browserLocalPersistence,
  browserSessionPersistence,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  AUTH_ERROR_CODES,
  AuthErrorCode,
  AuthService,
  AuthServiceError,
  AuthSignInOptions,
  AuthSignUpProfile,
  AuthUser,
} from '@zhunam/auth';

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
  };
}

// Every AUTH_ERROR_CODES value except 'auth/unknown' is a real Firebase
// code too, so a Firebase error already carrying one of these passes
// through unchanged. Anything else, including a Firebase code this
// library doesn't recognize, normalizes to 'auth/unknown'.
const KNOWN_FIREBASE_CODES: ReadonlySet<string> = new Set(Object.values(AUTH_ERROR_CODES));

function rawErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Every Firebase call in this service goes through this, so the consumer
// only ever sees AuthServiceError with a normalized code, never a raw
// FirebaseError whose code (and message language, and exact wording)
// depends on the SDK version and project configuration.
function mapFirebaseError(error: unknown): AuthServiceError {
  const code = rawErrorCode(error);
  // Firebase's own legacy code for "right email, wrong password" is
  // deliberately folded into invalidCredential: with Email Enumeration
  // Protection enabled (the default for projects created after
  // 2023-09-15), Firebase itself already returns 'auth/invalid-credential'
  // for both this case and "email not found", so treating the legacy
  // code identically keeps this mapping consistent regardless of
  // whether that protection is on for a given project.
  if (code === 'auth/wrong-password') {
    return new AuthServiceError(AUTH_ERROR_CODES.invalidCredential, errorMessage(error), error);
  }
  if (code && KNOWN_FIREBASE_CODES.has(code)) {
    return new AuthServiceError(code as AuthErrorCode, errorMessage(error), error);
  }
  return new AuthServiceError(AUTH_ERROR_CODES.unknown, errorMessage(error), error);
}

async function runFirebase<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapFirebaseError(error);
  }
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

  async signIn(email: string, password: string, options?: AuthSignInOptions): Promise<AuthUser> {
    return runFirebase(async () => {
      // Only touched when the caller explicitly asks: setPersistence is
      // global to this Auth instance (not scoped to one sign-in call) and
      // stays in effect for every later sign-in until changed again or the
      // page reloads. See the README for the full note before assuming
      // it resets itself.
      if (options?.persistent !== undefined) {
        await setPersistence(this.auth, options.persistent ? browserLocalPersistence : browserSessionPersistence);
      }
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      return toAuthUser(credential.user);
    });
  }

  async signUp(email: string, password: string, profile?: AuthSignUpProfile): Promise<AuthUser> {
    return runFirebase(async () => {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);

      if (profile?.displayName) {
        try {
          await updateProfile(credential.user, { displayName: profile.displayName });
        } catch {
          // The account itself was already created successfully; a failed
          // profile update is a lesser, recoverable problem (the user can
          // set their name later) and shouldn't fail the whole sign-up.
          // Falls through to the plain toAuthUser(auth.currentUser) below,
          // which reports displayName as null since it was never set.
        }
      }

      // auth.currentUser, not credential.user: updateProfile() mutates the
      // SDK's own current-user instance, and reading through auth.currentUser
      // is what guarantees this reflects that mutation regardless of
      // whether credential.user happens to be the same object reference.
      const current = this.auth.currentUser ?? credential.user;
      const user = toAuthUser(current);
      // onAuthStateChanged doesn't re-fire just because updateProfile()
      // changed the current user's displayName (no sign-in/sign-out
      // happened), so currentUser() would otherwise keep reporting the
      // stale displayName from the moment createUserWithEmailAndPassword
      // resolved. Setting it explicitly here is what makes it correct.
      this.userSignal.set(user);
      return user;
    });
  }

  async signOut(): Promise<void> {
    return runFirebase(() => firebaseSignOut(this.auth));
  }

  async resetPassword(email: string): Promise<void> {
    return runFirebase(() => sendPasswordResetEmail(this.auth, email));
  }

  /**
   * Firebase-specific: `code` is the `oobCode` query parameter from the
   * password reset link, which the consumer must extract from the page
   * URL themselves (this library has no routing opinion). Calling this
   * without one fails locally with `AUTH_ERROR_CODES.invalidActionCode`,
   * without ever reaching the Firebase SDK.
   */
  async completePasswordReset(newPassword: string, code?: string): Promise<void> {
    if (!code) {
      throw new AuthServiceError(
        AUTH_ERROR_CODES.invalidActionCode,
        'A password reset code is required to complete the reset with Firebase.',
        undefined,
      );
    }
    return runFirebase(() => confirmPasswordReset(this.auth, code, newPassword));
  }

  async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    return user ? user.getIdToken() : null;
  }
}
