import { inject, NgZone, Provider } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { AUTH_SERVICE } from '@zhunam/auth';
import { FirebaseAuthConfig } from './models/firebase-auth-config';
import { FirebaseAuthService } from './firebase-auth.service';

/**
 * Registers a Firebase Auth-backed implementation of `AuthService` under
 * the `AUTH_SERVICE` token, following the same "functional providers"
 * pattern as Angular's own `provideHttpClient`.
 *
 * Initializes the Firebase app and Auth instance internally — the
 * consumer never touches the Firebase SDK directly.
 *
 * @param config Minimal Firebase project config needed to initialize Auth.
 *   Read this from `environment.ts` in the consuming app, never hardcode
 *   it in versioned source (see `FirebaseAuthConfig` for why `apiKey`
 *   still shouldn't be hardcoded even though it isn't secret).
 *
 * @example
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideFirebaseAuth({
 *       apiKey: environment.firebase.apiKey,
 *       authDomain: environment.firebase.authDomain,
 *       projectId: environment.firebase.projectId,
 *     }),
 *   ],
 * };
 */
export function provideFirebaseAuth(config: FirebaseAuthConfig): Provider[] {
  return [
    {
      provide: AUTH_SERVICE,
      useFactory: () => {
        const app = initializeApp(config);
        const auth = getAuth(app);
        return new FirebaseAuthService(auth, inject(NgZone));
      },
    },
  ];
}
