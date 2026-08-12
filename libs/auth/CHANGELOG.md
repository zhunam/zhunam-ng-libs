# Changelog

All notable changes to `@zhunam/auth` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added
- `AuthUser` interface — minimal user shape (`uid`, `email`,
  `emailVerified`, `displayName`), no tokens/credentials/provider
  metadata.
- `AuthService` interface — base contract each provider entry point
  (`firebase/`, `supabase/`) must implement: reactive `currentUser` /
  `isAuthenticated` signals, `signIn`, `signUp`, `signOut`,
  `resetPassword`, `getIdToken`.
- `AUTH_SERVICE` injection token — each provider entry point registers
  its `AuthService` implementation under this token; consumers and
  `authGuard` inject it the same way regardless of provider.
- `authGuard` — `CanActivateFn` that redirects unauthenticated users to
  `AUTH_LOGIN_PATH` with `reason=unauthenticated` and `returnUrl` query
  params.
- `AUTH_LOGIN_PATH` injection token — configurable login route
  `authGuard` redirects to (`/login` by default).
