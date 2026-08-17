# Changelog

All notable changes to `@zhunam/auth` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-08-17

### Added
- `AuthUser` interface: minimal user shape (`uid`, `email`,
  `emailVerified`, `displayName`), no tokens/credentials/provider
  metadata.
- `AuthService` interface: base contract each provider entry point
  (`firebase/`, `supabase/`) must implement: reactive `currentUser` /
  `isAuthenticated` signals, `signIn`, `signUp`, `signOut`,
  `resetPassword`, `getIdToken`.
- `AUTH_SERVICE` injection token: each provider entry point registers
  its `AuthService` implementation under this token; consumers and
  `authGuard` inject it the same way regardless of provider.
- `authGuard`: `CanActivateFn` that redirects unauthenticated users to
  `AUTH_LOGIN_PATH` with `reason=unauthenticated` and `returnUrl` query
  params.
- `AUTH_LOGIN_PATH` injection token: configurable login route
  `authGuard` redirects to (`/login` by default).
- `@zhunam/auth/firebase` secondary entry point: `provideFirebaseAuth(config)`
  registers an `AuthService` backed by Firebase Auth's modular SDK
  (`firebase`, not `@angular/fire`) under `AUTH_SERVICE`. Maps Firebase's
  `User` to `AuthUser` with only the 4 public fields, propagates Firebase
  errors unchanged, and keeps `currentUser`/`isAuthenticated` in sync via
  `onAuthStateChanged`. `FirebaseAuthConfig`: minimal config shape
  (`apiKey`, `authDomain`, `projectId`) for `initializeApp`.
- `@zhunam/auth/supabase` secondary entry point: `provideSupabaseAuth(config)`
  registers an `AuthService` backed by Supabase Auth (`@supabase/supabase-js`)
  under `AUTH_SERVICE`. Maps Supabase's `User` to `AuthUser` with only the
  4 public fields (`displayName` read from `user_metadata.full_name` /
  `.name`, falling back to `null`), re-throws Supabase's `{ data, error }`
  errors unchanged, and keeps `currentUser`/`isAuthenticated` in sync via
  `onAuthStateChange`. `SupabaseAuthConfig`: minimal config shape (`url`,
  `anonKey`) for `createClient`.
- `@zhunam/auth/form-ui` secondary entry point: `LoginForm` (email +
  password, `loginSuccess` / `forgotPasswordClick` outputs),
  `RegisterForm` (email + password + confirm-password with a
  cross-field match validator, `registerSuccess` output), and
  `ResetPasswordForm` (email only, always shows the same generic
  success message regardless of whether the account exists, to avoid
  leaking registered emails). All three wrap `<lib-form-builder>`
  internally and inject `AUTH_SERVICE`; `@zhunam/form-builder` is an
  optional peerDependency of this entry point only.
- `AuthFormsModule`: NgModule wrapper around `LoginForm`, `RegisterForm`,
  and `ResetPasswordForm` (`imports`/`exports` all three), for consumers
  still on a classic NgModule architecture. A single combined module
  rather than one per component, since a typical auth flow needs all
  three together and Angular's tree-shaking works per standalone
  component regardless of NgModule export grouping. Additive, no
  breaking change to the existing standalone contract.
