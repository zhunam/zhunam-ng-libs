# Changelog

All notable changes to `@zhunam/auth` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

## [3.1.0] - 2026-10-02

### Added
- `AuthService.updateProfile?(displayName)` and
  `AuthService.changePassword?(currentPassword, newPassword)`: both
  optional, additive, no breaking change. Implemented in both
  `FirebaseAuthService` and `SupabaseAuthService`.
  - Both reject locally with `AUTH_ERROR_CODES.userNotFound`, without
    ever reaching the provider's SDK, when there's no signed-in user
    (`changePassword` also when the signed-in user has no email at
    all, e.g. a phone-only or OAuth-only account).
  - Firebase's `changePassword` always reauthenticates first with
    `EmailAuthProvider.credential`, so a wrong `currentPassword`
    rejects with `AUTH_ERROR_CODES.invalidCredential` and
    `updatePassword()` never surfaces Firebase's own
    `auth/requires-recent-login`.
  - Supabase's `changePassword` signs in again with
    `currentPassword` first (the only reliable way to verify it;
    Supabase's native `UserAttributes.current_password` field is a
    silent no-op unless the project enabled "Secure password change",
    off by default), then calls `updateUser()` with the new password.
    Emits `SIGNED_IN` then `USER_UPDATED` to any consumer listener on
    `onAuthStateChange`, `currentUser()` never passing through `null`.
    A new password equal to the previous one rejects with
    `AUTH_ERROR_CODES.unknown` (Supabase's own `same_password` code
    has no dedicated member; `cause` carries the original error).
  - See the README's "Updating profile and password" section,
    including the known limitation that Supabase's `changePassword`
    doesn't step a session up past `aal1`, so it doesn't satisfy a
    project's MFA requirement by itself.

## [3.0.0] - 2026-09-28

### Added
- `AUTH_ERROR_CODES`, `AuthErrorCode`, `AuthServiceError`: every
  `AuthService` method now rejects with an `AuthServiceError` carrying a
  normalized `code` (one of `AUTH_ERROR_CODES`) and the original
  provider error as `cause`, instead of a raw Firebase/Supabase error.
  Exported from the core.
- `AuthSignUpProfile` and a new optional third parameter on
  `signUp(email, password, profile?)`: set `displayName` on the new
  account at sign-up time. Firebase calls `updateProfile()` right after
  creating the account and reflects the name in `currentUser`
  immediately (`onAuthStateChanged` doesn't re-fire on its own for a
  profile-only change). Supabase sends it as `options.data.full_name`.
  If Firebase's `updateProfile()` itself fails, sign-up still resolves,
  with `displayName: null`, since the account was already created
  successfully by that point.
- `AuthSignInOptions` and a new optional third parameter on
  `signIn(email, password, options?)`: `persistent` controls session
  persistence for Firebase (`setPersistence()` with
  `browserLocalPersistence`/`browserSessionPersistence`, only called at
  all when `persistent` is explicitly set). Supabase ignores it, its
  persistence is a client-wide setting.
- `AuthService.completePasswordReset?(newPassword, code?)`: optional
  method that completes a reset started by `resetPassword()`. Firebase
  requires `code` (the reset link's `oobCode`, extracted by the
  consumer); Supabase ignores it, since the recovery session is already
  established client-side by the time this runs. See the README for the
  full per-provider explanation.

### Changed (`@zhunam/auth/firebase`, `@zhunam/auth/supabase`)
- **BREAKING**: both adapters now throw `AuthServiceError` (see Added
  above) instead of propagating the provider's raw error unchanged. Code
  that inspected a caught error's shape directly (e.g. Firebase's
  `error.code` string, or Supabase's `AuthApiError` instance) needs to
  read `error.code` against `AUTH_ERROR_CODES` instead, or read
  `error.cause` for the original error.
- `@zhunam/form-builder` peer dependency raised to `^3.0.0` (was
  `^2.0.0`), for `@zhunam/auth/form-ui`'s own use of the new
  form-builder submit/password-toggle features; see that library's own
  CHANGELOG.

### Changed (`@zhunam/auth/form-ui`)
- **BREAKING**: `LoginForm`, `RegisterForm`, and `ResetPasswordForm`'s
  `fields` are now built from a `computed()` instead of a module-level
  constant shared by every instance, so their labels can react to
  `AUTH_UI_MESSAGES`. Changing the active language rebuilds the
  underlying `FormGroup` (same effect changing `fields` on
  `@zhunam/form-builder` always had), which clears whatever the user had
  already typed. This is a known, accepted limitation for this change,
  not addressed here.
- **BREAKING**: `RegisterForm`'s password-match cross-field validator is
  now built per instance instead of as a module-level constant, so its
  "Passwords must match" message can be translated. It re-reads
  `AUTH_UI_MESSAGES` on every validation run (each submit attempt), not
  retroactively on a message already on screen.
- **BREAKING**: `--zhunam-*` defaults are no longer declared on
  `LoginForm`/`RegisterForm`/`ResetPasswordForm`'s own `:host`. A
  consumer stylesheet that already set one of these properties on an
  ancestor (e.g. `:root`) that is less specific than `:host` will now
  see that value actually apply, where it was silently overridden
  before. No default value changed.
- `@zhunam/form-builder` peer dependency requirement is unchanged
  (`^2.0.0`), but translating a form-ui component completely now also
  requires `provideFormBuilderMessages()` from that library, see its own
  CHANGELOG for the English-default breaking change there.

### Added (`@zhunam/auth/form-ui`)
- `AuthUiMessages`, `AUTH_UI_MESSAGES` (`InjectionToken`),
  `provideAuthUiMessages()`, `AUTH_UI_MESSAGES_EN`, `AUTH_UI_MESSAGES_ES`:
  translate field labels, the "Forgot your password?" link, the
  password-match message, and the reset-sent message. Every message is a
  function evaluated on render, so one that reads a signal updates live.
  Exported from `@zhunam/auth/form-ui`, not from the core.
- `--zhunam-error-text`, `--zhunam-success-text`, `--zhunam-primary-text`
  custom properties (each defaults to its non-`-text` counterpart): the
  error banner, success message, and "Forgot your password?" link's own
  text colors, independent from the background/accent role each
  non-`-text` property already had.
- `LoginForm`'s "Forgot your password?" link now shows a visible
  `:focus-visible` outline (`--zhunam-focus`, falling back to
  `--zhunam-primary`), matching the focus treatment already used
  elsewhere in the `@zhunam/*` libraries. Previously unstyled, relying
  on whatever default (or none) the browser happened to apply.

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
