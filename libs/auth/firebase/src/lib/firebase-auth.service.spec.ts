import { NgZone, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Auth, User } from 'firebase/auth';
import { AUTH_ERROR_CODES, AuthServiceError } from '@zhunam/auth';
import { FirebaseAuthService } from './firebase-auth.service';

const {
  onAuthStateChangedMock,
  signInWithEmailAndPasswordMock,
  createUserWithEmailAndPasswordMock,
  signOutMock,
  sendPasswordResetEmailMock,
  updateProfileMock,
  setPersistenceMock,
  confirmPasswordResetMock,
  reauthenticateWithCredentialMock,
  updatePasswordMock,
  emailAuthProviderCredentialMock,
  verifyPasswordResetCodeMock,
} = vi.hoisted(() => ({
  onAuthStateChangedMock: vi.fn(),
  signInWithEmailAndPasswordMock: vi.fn(),
  createUserWithEmailAndPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  sendPasswordResetEmailMock: vi.fn(),
  updateProfileMock: vi.fn(),
  setPersistenceMock: vi.fn(),
  confirmPasswordResetMock: vi.fn(),
  reauthenticateWithCredentialMock: vi.fn(),
  updatePasswordMock: vi.fn(),
  emailAuthProviderCredentialMock: vi.fn(),
  verifyPasswordResetCodeMock: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: onAuthStateChangedMock,
  signInWithEmailAndPassword: signInWithEmailAndPasswordMock,
  createUserWithEmailAndPassword: createUserWithEmailAndPasswordMock,
  signOut: signOutMock,
  sendPasswordResetEmail: sendPasswordResetEmailMock,
  updateProfile: updateProfileMock,
  setPersistence: setPersistenceMock,
  confirmPasswordReset: confirmPasswordResetMock,
  reauthenticateWithCredential: reauthenticateWithCredentialMock,
  updatePassword: updatePasswordMock,
  verifyPasswordResetCode: verifyPasswordResetCodeMock,
  EmailAuthProvider: { credential: emailAuthProviderCredentialMock },
  browserLocalPersistence: 'browserLocalPersistence-sentinel',
  browserSessionPersistence: 'browserSessionPersistence-sentinel',
}));

function createFirebaseUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'uid-1',
    email: 'user@example.com',
    emailVerified: true,
    displayName: 'Test User',
    // Firebase-only fields that must NOT leak into the mapped AuthUser.
    phoneNumber: '+10000000000',
    photoURL: 'https://example.com/photo.png',
    providerId: 'firebase',
    getIdToken: vi.fn().mockResolvedValue('id-token-123'),
    ...overrides,
  } as unknown as User;
}

describe('FirebaseAuthService', () => {
  let authStateCallback: (user: User | null) => void;
  const fakeAuth = { currentUser: null } as Auth;

  // Auth.currentUser is readonly in the real Firebase types (the SDK
  // manages it internally); this cast is only needed here, to simulate
  // the SDK updating it after createUserWithEmailAndPassword resolves.
  function setFakeAuthCurrentUser(user: User | null): void {
    (fakeAuth as { currentUser: User | null }).currentUser = user;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    onAuthStateChangedMock.mockImplementation((_auth: Auth, callback: (user: User | null) => void) => {
      authStateCallback = callback;
      return vi.fn();
    });
  });

  function createService(): FirebaseAuthService {
    return new FirebaseAuthService(fakeAuth, TestBed.inject(NgZone));
  }

  it('reflects the user emitted by onAuthStateChanged in currentUser', () => {
    const service = createService();

    authStateCallback(createFirebaseUser());

    expect(service.currentUser()).toEqual({
      uid: 'uid-1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'Test User',
    });
  });

  it('isAuthenticated is false with no user and true once one is set', () => {
    const service = createService();
    expect(service.isAuthenticated()).toBe(false);

    authStateCallback(createFirebaseUser());
    expect(service.isAuthenticated()).toBe(true);
  });

  it('goes back to unauthenticated when onAuthStateChanged emits null (sign-out)', () => {
    const service = createService();
    authStateCallback(createFirebaseUser());
    expect(service.isAuthenticated()).toBe(true);

    authStateCallback(null);

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('signIn calls signInWithEmailAndPassword with the given credentials and maps only the 4 AuthUser fields', async () => {
    const service = createService();
    const firebaseUser = createFirebaseUser();
    signInWithEmailAndPasswordMock.mockResolvedValue({ user: firebaseUser });

    const result = await service.signIn('user@example.com', 'secret');

    expect(signInWithEmailAndPasswordMock).toHaveBeenCalledWith(fakeAuth, 'user@example.com', 'secret');
    expect(result).toEqual({
      uid: 'uid-1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'Test User',
    });
    expect(Object.keys(result)).toEqual(['uid', 'email', 'emailVerified', 'displayName']);
  });

  it('getIdToken returns null when there is no current user', async () => {
    const service = createService();

    await expect(service.getIdToken()).resolves.toBeNull();
  });

  it('getIdToken returns the token from the current Firebase user', async () => {
    const firebaseUser = createFirebaseUser();
    const authWithUser = { currentUser: firebaseUser } as Auth;
    const service = new FirebaseAuthService(authWithUser, TestBed.inject(NgZone));

    await expect(service.getIdToken()).resolves.toBe('id-token-123');
  });

  it('signUp calls createUserWithEmailAndPassword and maps only the 4 AuthUser fields', async () => {
    const service = createService();
    const firebaseUser = createFirebaseUser();
    createUserWithEmailAndPasswordMock.mockResolvedValue({ user: firebaseUser });
    setFakeAuthCurrentUser(firebaseUser);

    const result = await service.signUp('new@example.com', 'secret');

    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(fakeAuth, 'new@example.com', 'secret');
    expect(result).toEqual({
      uid: 'uid-1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'Test User',
    });
    setFakeAuthCurrentUser(null);
  });

  it('signOut calls Firebase signOut', async () => {
    const service = createService();
    signOutMock.mockResolvedValue(undefined);

    await service.signOut();

    expect(signOutMock).toHaveBeenCalledWith(fakeAuth);
  });

  it('resetPassword calls sendPasswordResetEmail with the given email', async () => {
    const service = createService();
    sendPasswordResetEmailMock.mockResolvedValue(undefined);

    await service.resetPassword('user@example.com');

    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(fakeAuth, 'user@example.com');
  });

  describe('A1: normalized errors (AuthServiceError)', () => {
    it.each([
      ['auth/email-already-in-use'],
      ['auth/user-not-found'],
      ['auth/weak-password'],
      ['auth/too-many-requests'],
      ['auth/network-request-failed'],
      ['auth/invalid-email'],
      ['auth/invalid-action-code'],
      ['auth/expired-action-code'],
    ])('a known Firebase code (%s) passes through unchanged', async (code) => {
      const service = createService();
      const firebaseError = Object.assign(new Error('firebase message'), { code });
      signInWithEmailAndPasswordMock.mockRejectedValue(firebaseError);

      await expect(service.signIn('user@example.com', 'wrong')).rejects.toMatchObject({
        code,
      });
    });

    it('maps auth/wrong-password to auth/invalid-credential', async () => {
      const service = createService();
      const firebaseError = Object.assign(new Error('The password is invalid.'), {
        code: 'auth/wrong-password',
      });
      signInWithEmailAndPasswordMock.mockRejectedValue(firebaseError);

      await expect(service.signIn('user@example.com', 'wrong')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.invalidCredential,
      });
    });

    it('maps an unrecognized Firebase code to auth/unknown', async () => {
      const service = createService();
      const firebaseError = Object.assign(new Error('Popup closed.'), {
        code: 'auth/popup-closed-by-user',
      });
      signInWithEmailAndPasswordMock.mockRejectedValue(firebaseError);

      await expect(service.signIn('user@example.com', 'wrong')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.unknown,
      });
    });

    it('maps an error with no code at all to auth/unknown', async () => {
      const service = createService();
      const plainError = new Error('Something broke.');
      signInWithEmailAndPasswordMock.mockRejectedValue(plainError);

      await expect(service.signIn('user@example.com', 'wrong')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.unknown,
      });
    });

    it('always rejects with a real AuthServiceError, message and cause preserved from the original error', async () => {
      const service = createService();
      const firebaseError = Object.assign(new Error('The password is invalid.'), {
        code: 'auth/invalid-credential',
      });
      signInWithEmailAndPasswordMock.mockRejectedValue(firebaseError);

      let rejected: unknown;
      try {
        await service.signIn('user@example.com', 'wrong');
      } catch (error) {
        rejected = error;
      }

      expect(rejected).toBeInstanceOf(AuthServiceError);
      expect((rejected as AuthServiceError).message).toBe('The password is invalid.');
      expect((rejected as AuthServiceError).cause).toBe(firebaseError);
    });
  });

  describe('A2: completePasswordReset', () => {
    it('without a code, fails locally with invalidActionCode and never calls the Firebase SDK', async () => {
      const service = createService();

      await expect(service.completePasswordReset('new-password')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.invalidActionCode,
      });
      expect(confirmPasswordResetMock).not.toHaveBeenCalled();
    });

    it('with a code, calls confirmPasswordReset with it', async () => {
      const service = createService();
      confirmPasswordResetMock.mockResolvedValue(undefined);

      await service.completePasswordReset('new-password', 'oob-code-123');

      expect(confirmPasswordResetMock).toHaveBeenCalledWith(fakeAuth, 'oob-code-123', 'new-password');
    });

    it('maps a confirmPasswordReset failure through the same normalization', async () => {
      const service = createService();
      confirmPasswordResetMock.mockRejectedValue(
        Object.assign(new Error('Code expired.'), { code: 'auth/expired-action-code' }),
      );

      await expect(service.completePasswordReset('new-password', 'oob-code-123')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.expiredActionCode,
      });
    });
  });

  describe('A3: signUp with a display name profile', () => {
    it('calls updateProfile and reflects the display name in both the returned user and currentUser', async () => {
      const service = createService();
      const firebaseUser = createFirebaseUser({ displayName: null });
      createUserWithEmailAndPasswordMock.mockResolvedValue({ user: firebaseUser });
      updateProfileMock.mockImplementation(async (user: User, attrs: { displayName: string }) => {
        (user as { displayName: string | null }).displayName = attrs.displayName;
      });
      setFakeAuthCurrentUser(firebaseUser);

      const result = await service.signUp('new@example.com', 'secret', { displayName: 'Ada Lovelace' });

      expect(updateProfileMock).toHaveBeenCalledWith(firebaseUser, { displayName: 'Ada Lovelace' });
      expect(result.displayName).toBe('Ada Lovelace');
      expect(service.currentUser()?.displayName).toBe('Ada Lovelace');
      setFakeAuthCurrentUser(null);
    });

    it('without a profile, never calls updateProfile', async () => {
      const service = createService();
      const firebaseUser = createFirebaseUser();
      createUserWithEmailAndPasswordMock.mockResolvedValue({ user: firebaseUser });
      setFakeAuthCurrentUser(firebaseUser);

      await service.signUp('new@example.com', 'secret');

      expect(updateProfileMock).not.toHaveBeenCalled();
      setFakeAuthCurrentUser(null);
    });

    it('resolves with displayName null, not a rejection, when updateProfile itself fails', async () => {
      const service = createService();
      const firebaseUser = createFirebaseUser({ displayName: null });
      createUserWithEmailAndPasswordMock.mockResolvedValue({ user: firebaseUser });
      updateProfileMock.mockRejectedValue(new Error('Profile update failed.'));
      setFakeAuthCurrentUser(firebaseUser);

      const result = await service.signUp('new@example.com', 'secret', { displayName: 'Ada Lovelace' });

      expect(result.displayName).toBeNull();
      setFakeAuthCurrentUser(null);
    });
  });

  describe('A4: signIn persistence', () => {
    it('persistent: true calls setPersistence with browserLocalPersistence before signing in', async () => {
      const service = createService();
      const firebaseUser = createFirebaseUser();
      signInWithEmailAndPasswordMock.mockResolvedValue({ user: firebaseUser });
      setPersistenceMock.mockResolvedValue(undefined);

      await service.signIn('user@example.com', 'secret', { persistent: true });

      expect(setPersistenceMock).toHaveBeenCalledWith(fakeAuth, 'browserLocalPersistence-sentinel');
    });

    it('persistent: false calls setPersistence with browserSessionPersistence', async () => {
      const service = createService();
      const firebaseUser = createFirebaseUser();
      signInWithEmailAndPasswordMock.mockResolvedValue({ user: firebaseUser });
      setPersistenceMock.mockResolvedValue(undefined);

      await service.signIn('user@example.com', 'secret', { persistent: false });

      expect(setPersistenceMock).toHaveBeenCalledWith(fakeAuth, 'browserSessionPersistence-sentinel');
    });

    it('without options.persistent, never calls setPersistence', async () => {
      const service = createService();
      const firebaseUser = createFirebaseUser();
      signInWithEmailAndPasswordMock.mockResolvedValue({ user: firebaseUser });

      await service.signIn('user@example.com', 'secret');

      expect(setPersistenceMock).not.toHaveBeenCalled();
    });
  });

  describe('A5: updateProfile', () => {
    it('rejects with userNotFound and never calls the Firebase SDK when there is no current user', async () => {
      const service = createService();

      await expect(service.updateProfile('New Name')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.userNotFound,
      });
      expect(updateProfileMock).not.toHaveBeenCalled();
    });

    it('calls Firebase updateProfile and reflects the new display name in currentUser', async () => {
      const service = createService();
      const firebaseUser = createFirebaseUser({ displayName: 'Old Name' });
      setFakeAuthCurrentUser(firebaseUser);
      authStateCallback(firebaseUser);
      updateProfileMock.mockImplementation(async (user: User, attrs: { displayName: string }) => {
        (user as { displayName: string | null }).displayName = attrs.displayName;
      });

      await service.updateProfile('New Name');

      expect(updateProfileMock).toHaveBeenCalledWith(firebaseUser, { displayName: 'New Name' });
      expect(service.currentUser()?.displayName).toBe('New Name');
      setFakeAuthCurrentUser(null);
    });

    it('normalizes a Firebase updateProfile failure to AuthServiceError, cause preserved', async () => {
      const service = createService();
      const firebaseUser = createFirebaseUser();
      setFakeAuthCurrentUser(firebaseUser);
      const firebaseError = Object.assign(new Error('Network down.'), {
        code: 'auth/network-request-failed',
      });
      updateProfileMock.mockRejectedValue(firebaseError);

      let rejected: unknown;
      try {
        await service.updateProfile('New Name');
      } catch (error) {
        rejected = error;
      }

      expect(rejected).toBeInstanceOf(AuthServiceError);
      expect((rejected as AuthServiceError).code).toBe(AUTH_ERROR_CODES.networkRequestFailed);
      expect((rejected as AuthServiceError).cause).toBe(firebaseError);
      setFakeAuthCurrentUser(null);
    });
  });

  describe('A6: changePassword', () => {
    it('rejects with userNotFound and never calls the SDK when there is no current user', async () => {
      const service = createService();

      await expect(service.changePassword('current-pw', 'new-pw')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.userNotFound,
      });
      expect(emailAuthProviderCredentialMock).not.toHaveBeenCalled();
      expect(reauthenticateWithCredentialMock).not.toHaveBeenCalled();
      expect(updatePasswordMock).not.toHaveBeenCalled();
    });

    it('rejects with userNotFound when the current user has no email', async () => {
      const firebaseUser = createFirebaseUser({ email: null });
      setFakeAuthCurrentUser(firebaseUser);
      const service = createService();

      await expect(service.changePassword('current-pw', 'new-pw')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.userNotFound,
      });
      expect(reauthenticateWithCredentialMock).not.toHaveBeenCalled();
      setFakeAuthCurrentUser(null);
    });

    it('happy path: reauthenticates with EmailAuthProvider.credential, then calls updatePassword', async () => {
      const firebaseUser = createFirebaseUser();
      setFakeAuthCurrentUser(firebaseUser);
      const service = createService();
      emailAuthProviderCredentialMock.mockReturnValue('credential-sentinel');
      reauthenticateWithCredentialMock.mockResolvedValue({ user: firebaseUser });
      updatePasswordMock.mockResolvedValue(undefined);

      await service.changePassword('current-pw', 'new-pw');

      expect(emailAuthProviderCredentialMock).toHaveBeenCalledWith('user@example.com', 'current-pw');
      expect(reauthenticateWithCredentialMock).toHaveBeenCalledWith(firebaseUser, 'credential-sentinel');
      expect(updatePasswordMock).toHaveBeenCalledWith(firebaseUser, 'new-pw');
      // Reauthentication must happen before the password is ever touched.
      expect(reauthenticateWithCredentialMock.mock.invocationCallOrder[0]).toBeLessThan(
        updatePasswordMock.mock.invocationCallOrder[0],
      );
      setFakeAuthCurrentUser(null);
    });

    it('a wrong current password rejects with invalidCredential, cause preserved, and updatePassword is never called', async () => {
      const firebaseUser = createFirebaseUser();
      setFakeAuthCurrentUser(firebaseUser);
      const service = createService();
      emailAuthProviderCredentialMock.mockReturnValue('credential-sentinel');
      const firebaseError = Object.assign(new Error('The supplied auth credential is incorrect.'), {
        code: 'auth/invalid-credential',
      });
      reauthenticateWithCredentialMock.mockRejectedValue(firebaseError);

      let rejected: unknown;
      try {
        await service.changePassword('wrong-pw', 'new-pw');
      } catch (error) {
        rejected = error;
      }

      expect(rejected).toBeInstanceOf(AuthServiceError);
      expect((rejected as AuthServiceError).code).toBe(AUTH_ERROR_CODES.invalidCredential);
      expect((rejected as AuthServiceError).cause).toBe(firebaseError);
      expect(updatePasswordMock).not.toHaveBeenCalled();
      setFakeAuthCurrentUser(null);
    });

    it('a weak new password rejects with weakPassword (the server validates, not this library) and leaves currentUser unchanged', async () => {
      const firebaseUser = createFirebaseUser();
      setFakeAuthCurrentUser(firebaseUser);
      const service = createService();
      authStateCallback(firebaseUser);
      const beforeUser = service.currentUser();
      emailAuthProviderCredentialMock.mockReturnValue('credential-sentinel');
      reauthenticateWithCredentialMock.mockResolvedValue({ user: firebaseUser });
      updatePasswordMock.mockRejectedValue(
        Object.assign(new Error('Password too weak.'), { code: 'auth/weak-password' }),
      );

      await expect(service.changePassword('current-pw', '123')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.weakPassword,
      });
      expect(service.currentUser()).toEqual(beforeUser);
      setFakeAuthCurrentUser(null);
    });
  });

  describe('A7: verifyResetCode', () => {
    function firebaseError(code: string): Error {
      return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
    }

    it('verifies the code, then completePasswordReset without a code uses the verified one', async () => {
      const service = createService();
      verifyPasswordResetCodeMock.mockResolvedValue('user@example.com');
      confirmPasswordResetMock.mockResolvedValue(undefined);

      await service.verifyResetCode('oob-code-123');
      await service.completePasswordReset('new-password');

      expect(verifyPasswordResetCodeMock).toHaveBeenCalledWith(fakeAuth, 'oob-code-123');
      expect(confirmPasswordResetMock).toHaveBeenCalledWith(fakeAuth, 'oob-code-123', 'new-password');
    });

    it('an explicit code passed to completePasswordReset wins over the verified one', async () => {
      const service = createService();
      verifyPasswordResetCodeMock.mockResolvedValue('user@example.com');
      confirmPasswordResetMock.mockResolvedValue(undefined);

      await service.verifyResetCode('verified-code');
      await service.completePasswordReset('new-password', 'explicit-code');

      expect(confirmPasswordResetMock).toHaveBeenCalledWith(fakeAuth, 'explicit-code', 'new-password');
    });

    it('ignores the email argument', async () => {
      const service = createService();
      verifyPasswordResetCodeMock.mockResolvedValue('user@example.com');

      await service.verifyResetCode('oob-code-123', 'other@example.com');

      expect(verifyPasswordResetCodeMock).toHaveBeenCalledWith(fakeAuth, 'oob-code-123');
    });

    it('an empty code fails locally with invalidActionCode and never calls the SDK', async () => {
      const service = createService();

      await expect(service.verifyResetCode('')).rejects.toMatchObject({ code: AUTH_ERROR_CODES.invalidActionCode });
      expect(verifyPasswordResetCodeMock).not.toHaveBeenCalled();
    });

    it.each([
      ['auth/invalid-action-code', AUTH_ERROR_CODES.invalidActionCode],
      ['auth/expired-action-code', AUTH_ERROR_CODES.expiredActionCode],
    ])('maps %s to the normalized code, cause preserved', async (firebaseCode, expectedCode) => {
      const service = createService();
      const original = firebaseError(firebaseCode);
      verifyPasswordResetCodeMock.mockRejectedValue(original);

      const rejection = service.verifyResetCode('bad-code');

      await expect(rejection).rejects.toBeInstanceOf(AuthServiceError);
      await expect(rejection).rejects.toMatchObject({ code: expectedCode, cause: original });
    });

    it('a failed verification discards a previously verified code', async () => {
      const service = createService();
      verifyPasswordResetCodeMock.mockResolvedValueOnce('user@example.com');
      await service.verifyResetCode('first-code');
      verifyPasswordResetCodeMock.mockRejectedValueOnce(firebaseError('auth/expired-action-code'));
      await expect(service.verifyResetCode('second-code')).rejects.toBeInstanceOf(AuthServiceError);

      await expect(service.completePasswordReset('new-password')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.invalidActionCode,
      });
      expect(confirmPasswordResetMock).not.toHaveBeenCalled();
    });

    it('the verified code is single-use: cleared once completePasswordReset succeeds', async () => {
      const service = createService();
      verifyPasswordResetCodeMock.mockResolvedValue('user@example.com');
      confirmPasswordResetMock.mockResolvedValue(undefined);
      await service.verifyResetCode('oob-code-123');
      await service.completePasswordReset('new-password');

      await expect(service.completePasswordReset('another-password')).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.invalidActionCode,
      });
      expect(confirmPasswordResetMock).toHaveBeenCalledTimes(1);
    });

    it('keeps the verified code when completePasswordReset fails, so the user can retry with another password', async () => {
      const service = createService();
      verifyPasswordResetCodeMock.mockResolvedValue('user@example.com');
      confirmPasswordResetMock.mockRejectedValueOnce(firebaseError('auth/weak-password')).mockResolvedValueOnce(undefined);
      await service.verifyResetCode('oob-code-123');

      await expect(service.completePasswordReset('weak')).rejects.toMatchObject({ code: AUTH_ERROR_CODES.weakPassword });
      await service.completePasswordReset('strong-password');

      expect(confirmPasswordResetMock).toHaveBeenLastCalledWith(fakeAuth, 'oob-code-123', 'strong-password');
    });

    it('never exposes the verified code through JSON.stringify, Object.keys or Reflect.ownKeys', async () => {
      const service = createService();
      verifyPasswordResetCodeMock.mockResolvedValue('user@example.com');
      await service.verifyResetCode('secret-oob-code');

      expect(JSON.stringify(service)).not.toContain('secret-oob-code');
      const ownValues = Reflect.ownKeys(service).map((key) => (service as unknown as Record<PropertyKey, unknown>)[key]);
      expect(ownValues).not.toContain('secret-oob-code');
      expect(Object.keys(service).some((key) => /code/i.test(key))).toBe(false);
    });
  });
});
