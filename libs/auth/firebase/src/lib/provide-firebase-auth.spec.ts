import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUTH_SERVICE } from '@zhunam/auth';
import { provideFirebaseAuth } from './provide-firebase-auth';

const { initializeAppMock, getAuthMock, onAuthStateChangedMock } = vi.hoisted(() => ({
  initializeAppMock: vi.fn(),
  getAuthMock: vi.fn(),
  onAuthStateChangedMock: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  initializeApp: initializeAppMock,
}));

vi.mock('firebase/auth', () => ({
  getAuth: getAuthMock,
  onAuthStateChanged: onAuthStateChangedMock,
}));

describe('provideFirebaseAuth', () => {
  const config = { apiKey: 'key', authDomain: 'app.firebaseapp.com', projectId: 'app' };
  const fakeApp = { name: 'fake-app' };
  const fakeAuth = { currentUser: null };

  beforeEach(() => {
    vi.clearAllMocks();
    initializeAppMock.mockReturnValue(fakeApp);
    getAuthMock.mockReturnValue(fakeAuth);
    onAuthStateChangedMock.mockReturnValue(vi.fn());
  });

  it('initializes the Firebase app with the given config and registers an AuthService under AUTH_SERVICE', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFirebaseAuth(config)],
    });

    const authService = TestBed.inject(AUTH_SERVICE);

    expect(initializeAppMock).toHaveBeenCalledWith(config);
    expect(getAuthMock).toHaveBeenCalledWith(fakeApp);
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
