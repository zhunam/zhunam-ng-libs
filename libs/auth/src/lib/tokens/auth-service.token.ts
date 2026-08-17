import { InjectionToken } from '@angular/core';
import { AuthService } from '../models/auth-service';

/**
 * DI token for the active `AuthService` implementation.
 *
 * `AuthService` is an interface, not a class, so it can't be injected by
 * type. Each provider entry point (`@zhunam/auth/firebase`,
 * `@zhunam/auth/supabase`) provides its concrete implementation under this
 * token, and consumers (including `authGuard`) inject it the same way
 * regardless of which provider was chosen.
 *
 * There's no default `factory`: a provider MUST be registered by the
 * consuming app. Injecting this token without a provider throws
 * `NullInjectorError`, which is the intended failure mode: fail fast
 * instead of silently falling back to a phantom no-op auth service.
 *
 * @example
 * // In the app's providers, using e.g. the firebase entry point:
 * providers: [
 *   { provide: AUTH_SERVICE, useClass: FirebaseAuthService },
 * ]
 */
export const AUTH_SERVICE = new InjectionToken<AuthService>('AUTH_SERVICE');
