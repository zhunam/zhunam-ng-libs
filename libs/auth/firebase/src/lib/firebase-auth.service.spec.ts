import { NgZone, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Auth, User } from 'firebase/auth';
import { FirebaseAuthService } from './firebase-auth.service';

const {
  onAuthStateChangedMock,
  signInWithEmailAndPasswordMock,
  createUserWithEmailAndPasswordMock,
  signOutMock,
  sendPasswordResetEmailMock,
} = vi.hoisted(() => ({
  onAuthStateChangedMock: vi.fn(),
  signInWithEmailAndPasswordMock: vi.fn(),
  createUserWithEmailAndPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  sendPasswordResetEmailMock: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: onAuthStateChangedMock,
  signInWithEmailAndPassword: signInWithEmailAndPasswordMock,
  createUserWithEmailAndPassword: createUserWithEmailAndPasswordMock,
  signOut: signOutMock,
  sendPasswordResetEmail: sendPasswordResetEmailMock,
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

  it('propagates a Firebase error from signIn as-is', async () => {
    const service = createService();
    const firebaseError = Object.assign(new Error('The password is invalid.'), {
      code: 'auth/invalid-credential',
    });
    signInWithEmailAndPasswordMock.mockRejectedValue(firebaseError);

    await expect(service.signIn('user@example.com', 'wrong')).rejects.toBe(firebaseError);
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

    const result = await service.signUp('new@example.com', 'secret');

    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(fakeAuth, 'new@example.com', 'secret');
    expect(result).toEqual({
      uid: 'uid-1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'Test User',
    });
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
});
