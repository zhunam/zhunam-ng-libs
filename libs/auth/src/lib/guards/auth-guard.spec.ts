import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthUser } from '../models/auth-user';
import { AuthService } from '../models/auth-service';
import { AUTH_SERVICE } from '../tokens/auth-service.token';
import { AUTH_LOGIN_PATH, authGuard } from './auth-guard';

function createAuthServiceMock(isAuthenticated: boolean): AuthService {
  return {
    currentUser: signal<AuthUser | null>(null),
    isAuthenticated: signal(isAuthenticated),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    getIdToken: vi.fn(),
  };
}

function runGuard(state: RouterStateSnapshot) {
  return TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state));
}

describe('authGuard', () => {
  it('allows access when the user is authenticated', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AUTH_SERVICE, useValue: createAuthServiceMock(true) }],
    });

    const result = runGuard({ url: '/dashboard' } as RouterStateSnapshot);

    expect(result).toBe(true);
  });

  it('redirects to the login path with reason and returnUrl when unauthenticated', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AUTH_SERVICE, useValue: createAuthServiceMock(false) }],
    });

    const result = runGuard({ url: '/dashboard/settings' } as RouterStateSnapshot) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(result.root.children['primary']?.segments.map((s) => s.path)).toEqual(['login']);
    expect(result.queryParams['reason']).toBe('unauthenticated');
  });

  it('sets returnUrl to exactly the URL the user tried to visit', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AUTH_SERVICE, useValue: createAuthServiceMock(false) }],
    });

    const attemptedUrl = '/reports/2026?month=8&sort=desc';
    const result = runGuard({ url: attemptedUrl } as RouterStateSnapshot) as UrlTree;

    expect(result.queryParams['returnUrl']).toBe(attemptedUrl);
  });

  it('respects a custom AUTH_LOGIN_PATH', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AUTH_SERVICE, useValue: createAuthServiceMock(false) },
        { provide: AUTH_LOGIN_PATH, useValue: '/auth/sign-in' },
      ],
    });

    const result = runGuard({ url: '/dashboard' } as RouterStateSnapshot) as UrlTree;

    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result)).toContain('/auth/sign-in');
  });
});
