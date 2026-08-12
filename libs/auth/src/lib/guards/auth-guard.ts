import { inject, InjectionToken } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AUTH_SERVICE } from '../tokens/auth-service.token';

/**
 * Route path `authGuard` redirects to when there's no authenticated user.
 * @default '/login'
 *
 * @example
 * // Override in the app's providers to point at a different login route:
 * providers: [
 *   { provide: AUTH_LOGIN_PATH, useValue: '/auth/sign-in' },
 * ]
 */
export const AUTH_LOGIN_PATH = new InjectionToken<string>('AUTH_LOGIN_PATH', {
  providedIn: 'root',
  factory: () => '/login',
});

/**
 * Angular route guard that only allows access to authenticated users.
 *
 * On an unauthenticated visit, redirects to `AUTH_LOGIN_PATH` with two
 * query params: `reason=unauthenticated` and `returnUrl` set to the full
 * URL the user originally tried to reach, so the login page can send them
 * back there after a successful sign-in.
 *
 * Requires an `AuthService` implementation provided under the
 * `AUTH_SERVICE` token (see one of the provider entry points, e.g.
 * `@zhunam/auth/firebase`).
 *
 * @example
 * // In the route config:
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard],
 * }
 *
 * @example
 * // In the login page, reading the query params:
 * const reason = route.snapshot.queryParamMap.get('reason');
 * if (reason === 'unauthenticated') {
 *   // show a "please sign in" notice
 * }
 * const returnUrl = route.snapshot.queryParamMap.get('returnUrl');
 * // redirect to `returnUrl` (or '/') after a successful sign-in
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AUTH_SERVICE);
  const router = inject(Router);
  const loginPath = inject(AUTH_LOGIN_PATH);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([loginPath], {
    queryParams: {
      reason: 'unauthenticated',
      returnUrl: state.url,
    },
  });
};
