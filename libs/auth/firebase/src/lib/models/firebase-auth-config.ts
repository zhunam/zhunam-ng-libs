/**
 * Minimal Firebase project configuration needed to initialize Auth.
 *
 * Only the fields `initializeApp` actually needs to authenticate users are
 * included here — nothing else (no `storageBucket`, `messagingSenderId`,
 * `appId`, etc.), even though Firebase's own config object usually has more.
 *
 * `apiKey` is not a secret: it identifies your Firebase project to Google's
 * servers, and real protection comes from your project's Firebase Security
 * Rules, not from hiding this value. Still, it must come from
 * `environment.ts` / `environment.production.ts` in the consuming app,
 * never hardcoded in versioned source — same as any other build config.
 */
export interface FirebaseAuthConfig {
  /** Firebase Web API key for this project. */
  apiKey: string;

  /** Firebase Auth domain, e.g. `your-project.firebaseapp.com`. */
  authDomain: string;

  /** Firebase project ID. */
  projectId: string;
}
