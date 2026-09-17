# Changelog

All notable changes to `@zhunam/auth` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

## [2.0.0] - 2026-09-17

### Changed
- **BREAKING** (`@zhunam/auth/form-ui`): every CSS custom property on
  `LoginForm`, `RegisterForm`, and `ResetPasswordForm` is renamed to the
  shared `--zhunam-*` namespace, unified across all `@zhunam/*`
  libraries so they use one consistent name per theming role instead of
  a library-specific `--auth-*` prefix. No compatibility aliases are
  kept for the old names; update any stylesheet that sets one of them.
  The fields rendered by the wrapped `<lib-form-builder>` were already
  themed through its own `--zhunam-*` properties and are unaffected
  beyond the rename of `@zhunam/form-builder` itself (see that
  library's changelog).
- **BREAKING**: `@zhunam/form-builder` peer dependency raised to
  `^2.0.0` (was `^1.0.0`), required for `@zhunam/auth/form-ui` to pick
  up form-builder's own `--zhunam-*` rename above.
- Every `var()` usage now carries an inline fallback matching its
  `:host` default, so these components degrade gracefully if that
  declaration is ever missing instead of resolving to an invalid value.

| Old name | New name | Used by |
| -------------------- | ------------------- | ------------------------------------------------ |
| `--auth-error-color`  | `--zhunam-error`   | `LoginForm`, `RegisterForm`, `ResetPasswordForm` |
| `--auth-link-color`   | `--zhunam-primary` | `LoginForm` |
| `--auth-success-color`| `--zhunam-success` | `ResetPasswordForm` |
| `--auth-spacing`      | `--zhunam-spacing` | `LoginForm`, `RegisterForm`, `ResetPasswordForm` |

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
