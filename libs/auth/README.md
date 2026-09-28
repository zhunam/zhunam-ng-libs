# @zhunam/auth

A thin, unified wrapper over Firebase Auth and Supabase Auth for Angular. Reactive user state, a route guard, and optional prebuilt login/register/reset-password forms, all behind one provider-agnostic contract.

## Which package do I install?

This library ships as four entry points. You always need the core, plus exactly one provider:

| Entry point               | Required?             | What it gives you                                                   |
| -------------------------- | ---------------------- | --------------------------------------------------------------------- |
| `@zhunam/auth`              | Always                | `AuthUser`, the `AuthService` contract, `authGuard`, injection tokens |
| `@zhunam/auth/firebase`     | Choose one (with core) | `AuthService` implementation backed by Firebase Auth                 |
| `@zhunam/auth/supabase`     | Choose one (with core) | `AuthService` implementation backed by Supabase Auth                 |
| `@zhunam/auth/form-ui`      | Optional               | Prebuilt `LoginForm`, `RegisterForm`, `ResetPasswordForm` components  |

The core alone has no opinion on Firebase or Supabase. You pick a provider entry point to register a concrete implementation, and everything else in your app, including `authGuard` and the form-ui components, keeps working against the same `AuthService` contract regardless of which one you chose.

## Installation

All four entry points live in the single `@zhunam/auth` npm package. `firebase`, `@supabase/supabase-js`, and `@zhunam/form-builder` are optional peer dependencies, install only the one matching the entry point you use.

```bash
# Using Firebase Auth
npm install @zhunam/auth firebase
```

```bash
# Using Supabase Auth
npm install @zhunam/auth @supabase/supabase-js
```

Add `@zhunam/form-builder` too if you also want `@zhunam/auth/form-ui`:

```bash
npm install @zhunam/form-builder
```

## Usage

### 1. Headless, no form-ui

```typescript
// app.config.ts
import { provideFirebaseAuth } from '@zhunam/auth/firebase';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFirebaseAuth({
      apiKey: environment.firebase.apiKey,
      authDomain: environment.firebase.authDomain,
      projectId: environment.firebase.projectId,
    }),
  ],
};
```

```typescript
// login.component.ts
import { inject } from '@angular/core';
import { AUTH_SERVICE } from '@zhunam/auth';

export class LoginComponent {
  private readonly authService = inject(AUTH_SERVICE);

  async signIn(email: string, password: string) {
    return this.authService.signIn(email, password);
  }
}
```

### 2. With form-ui

Same provider setup as above, plus:

```html
<lib-login-form (loginSuccess)="onLoginSuccess($event)" />
```

```typescript
protected onLoginSuccess(user: AuthUser): void {
  // navigate, update local state, etc.
}
```

## API

### Core (`@zhunam/auth`)

`AuthUser`

| Field           | Type             | Description                                    |
| --------------- | ---------------- | ----------------------------------------------- |
| `uid`           | `string`         | Unique, stable identifier from the provider.     |
| `email`         | `string \| null` | User's email, or `null` if the provider didn't return one. |
| `emailVerified` | `boolean`        | Whether the user has verified their email.       |
| `displayName`   | `string \| null` | User's display name, or `null` if none is set.   |

`AuthService` (the contract every provider entry point implements)

| Member                                 | Type                      | Description                                       |
| --------------------------------------- | ------------------------- | --------------------------------------------------- |
| `currentUser`                           | `Signal<AuthUser \| null>` | The current user, read-only, updates reactively.    |
| `isAuthenticated`                       | `Signal<boolean>`          | Derived from `currentUser`.                         |
| `signIn(email, password, options?)`     | `Promise<AuthUser>`        | Signs in an existing user. `options`: see `AuthSignInOptions`. |
| `signUp(email, password, profile?)`     | `Promise<AuthUser>`        | Creates a new user account. `profile`: see `AuthSignUpProfile`. |
| `signOut()`                              | `Promise<void>`            | Signs out the current user.                         |
| `resetPassword(email)`                  | `Promise<void>`            | Sends a password reset email via the provider's native flow. |
| `completePasswordReset?(newPassword, code?)` | `Promise<void>`      | Optional. Completes a reset started by `resetPassword()`. See "Completing a password reset" below, the per-provider behavior differs. |
| `getIdToken()`                          | `Promise<string \| null>`  | Fresh ID token for authenticated HTTP calls, `null` if signed out. |

`AuthSignUpProfile`

| Field | Type | Description |
| ----- | ---- | ------------ |
| `displayName` | `string \| undefined` | Display name to set on the new account, if provided. |

`AuthSignInOptions`

| Field | Type | Description |
| ----- | ---- | ------------ |
| `persistent` | `boolean \| undefined` | Whether the session survives closing the browser. Left `undefined`, the provider's own default applies untouched. Firebase only: Supabase ignores this, see "Session persistence" below. |

### Normalized errors: `AUTH_ERROR_CODES` and `AuthServiceError`

Every `AuthService` method rejects with an `AuthServiceError`, never the
raw error a provider's SDK throws. Branch on `error.code`, which is
always one of `AUTH_ERROR_CODES`, without needing to import Firebase or
Supabase types:

```typescript
import { AUTH_ERROR_CODES, AuthServiceError } from '@zhunam/auth';

try {
  await authService.signIn(email, password);
} catch (error) {
  if (error instanceof AuthServiceError && error.code === AUTH_ERROR_CODES.invalidCredential) {
    // show a generic "wrong email or password" message
  }
}
```

`AuthServiceError`

| Member | Type | Description |
| ------ | ---- | ------------ |
| `code` | `AuthErrorCode` | One of `AUTH_ERROR_CODES`'s values. |
| `message` | `string` | Copied from the original provider error. |
| `cause` | `unknown` | The original error the provider threw, for logging or a provider-specific fallback. |

`AUTH_ERROR_CODES` and their real Firebase/Supabase equivalents:

| Code | Firebase | Supabase (`error.code`) |
| ---- | -------- | ------------------------ |
| `invalidCredential` (`auth/invalid-credential`) | `auth/invalid-credential`, `auth/wrong-password` | `invalid_credentials` |
| `emailAlreadyInUse` (`auth/email-already-in-use`) | `auth/email-already-in-use` | `user_already_exists`, `email_exists` |
| `userNotFound` (`auth/user-not-found`) | `auth/user-not-found` (only reachable without Email Enumeration Protection, see below) | Never: `signInWithPassword` is enumeration-safe by design |
| `weakPassword` (`auth/weak-password`) | `auth/weak-password` | `weak_password` |
| `tooManyRequests` (`auth/too-many-requests`) | `auth/too-many-requests` | `over_request_rate_limit`, `over_email_send_rate_limit` |
| `networkRequestFailed` (`auth/network-request-failed`) | `auth/network-request-failed` | An `AuthRetryableFetchError` instance |
| `invalidEmail` (`auth/invalid-email`) | `auth/invalid-email` | `email_address_invalid` |
| `invalidActionCode` (`auth/invalid-action-code`) | `auth/invalid-action-code`, or thrown locally by `completePasswordReset()` when called without a `code` | An `AuthSessionMissingError` instance (see "Completing a password reset") |
| `expiredActionCode` (`auth/expired-action-code`) | `auth/expired-action-code` | Not applicable |
| `unknown` (`auth/unknown`) | Any other Firebase code, or an error with no code at all | Any other error |

### Completing a password reset

`completePasswordReset(newPassword, code?)` finishes what
`resetPassword()` started. The two providers this library supports
handle it differently, which is why `code` is optional:

- **Firebase**: requires `code`, the `oobCode` query parameter from the
  reset link. Your app extracts it from the page URL (this library has
  no routing opinion) and passes it through. Calling this without one
  fails locally with `AUTH_ERROR_CODES.invalidActionCode`, without ever
  reaching the Firebase SDK.
- **Supabase**: ignores `code` entirely. Clicking the reset link already
  establishes a recovery session client-side, through whatever
  `detectSessionInUrl`/`flowType` the Supabase client was created with
  (both default to values that make this work automatically); by the
  time your app calls this, the session `updateUser()` needs is already
  active.

### Session persistence

`signIn(email, password, { persistent })` only has an effect with
Firebase. `true` calls `setPersistence(auth, browserLocalPersistence)`
before signing in, `false` calls it with `browserSessionPersistence`,
and leaving it `undefined` never calls `setPersistence()` at all, so the
Auth instance keeps whatever it already had. `setPersistence()` is
global to the Firebase Auth instance, not scoped to that one sign-in
call: it stays in effect for every later sign-in too, until changed
again or the page reloads.

`persistent: true` forces `browserLocalPersistence` specifically, not
just "some persistent storage". This differs from Firebase's own
default when `persistent` is left out entirely: `getAuth()` without
`setPersistence()` already tries `indexedDBLocalPersistence` first,
falling back to `browserLocalPersistence` only if the browser doesn't
support IndexedDB (confirmed against the installed `firebase` package's
own source, `platform_browser/index.ts`, not just its public docs). In
practice both end up durable across browser restarts, so most apps
never need to pass `persistent` at all: reach for it only when you
need an explicit choice between "remember me" and "just this session",
for example a checkbox in your own login form:

```typescript
async onSubmit(email: string, password: string, rememberMe: boolean) {
  await this.authService.signIn(email, password, { persistent: rememberMe });
}
```

Supabase ignores `persistent` completely: its `persistSession` is a
setting on the Supabase client itself, chosen once when the client is
created, not something a single sign-in call can override.

| Other exports        | Type                            | Description                                                        |
| --------------------- | -------------------------------- | --------------------------------------------------------------------- |
| `authGuard`            | `CanActivateFn`                  | Redirects to `AUTH_LOGIN_PATH` with `reason` and `returnUrl` query params if there's no session. |
| `AUTH_LOGIN_PATH`      | `InjectionToken<string>`         | Route `authGuard` redirects to. Default `/login`.                    |
| `AUTH_SERVICE`         | `InjectionToken<AuthService>`    | The token provider entry points register under; no default, injecting it without a provider throws. |

### `@zhunam/auth/firebase`

| Export                | Type                                                   | Description                                          |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| `provideFirebaseAuth(config)` | `(config: FirebaseAuthConfig) => Provider[]`     | Registers a Firebase Auth-backed `AuthService` under `AUTH_SERVICE`. |

`FirebaseAuthConfig`

| Field         | Type     | Description                                     |
| -------------- | -------- | -------------------------------------------------- |
| `apiKey`       | `string` | Firebase Web API key for this project.             |
| `authDomain`   | `string` | Firebase Auth domain, e.g. `your-project.firebaseapp.com`. |
| `projectId`    | `string` | Firebase project ID.                                |

### `@zhunam/auth/supabase`

| Export                | Type                                                   | Description                                          |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| `provideSupabaseAuth(config)` | `(config: SupabaseAuthConfig) => Provider[]`     | Registers a Supabase Auth-backed `AuthService` under `AUTH_SERVICE`. |

`SupabaseAuthConfig`

| Field       | Type     | Description                                    |
| ------------ | -------- | -------------------------------------------------- |
| `url`        | `string` | Supabase project URL, e.g. `https://your-project.supabase.co`. |
| `anonKey`    | `string` | Supabase anonymous (public) API key for this project. |

### `@zhunam/auth/form-ui`

`LoginForm` (`<lib-login-form>`)

| Output                 | Type              | Description                                          |
| ------------------------ | ------------------- | -------------------------------------------------------- |
| `loginSuccess`            | `output<AuthUser>` | Emitted with the signed-in user after a successful login. |
| `forgotPasswordClick`     | `output<void>`     | Emitted on the "Forgot your password?" click; no routing opinion, navigation is up to you. |

`RegisterForm` (`<lib-register-form>`)

| Output              | Type              | Description                                            |
| --------------------- | ------------------- | ---------------------------------------------------------- |
| `registerSuccess`      | `output<AuthUser>` | Emitted with the newly created user after a successful sign-up. |

`ResetPasswordForm` (`<lib-reset-password-form>`): a single email field, no inputs or outputs. Always shows the same generic success message regardless of whether the account exists, see Security below.

#### `AuthUiMessages`

| Member | Type | Used by |
| ------ | ---- | ------- |
| `emailLabel()` | `() => string` | `LoginForm`, `RegisterForm`, `ResetPasswordForm` |
| `passwordLabel()` | `() => string` | `LoginForm`, `RegisterForm` |
| `confirmPasswordLabel()` | `() => string` | `RegisterForm` |
| `forgotPassword()` | `() => string` | `LoginForm` |
| `passwordsMustMatch()` | `() => string` | `RegisterForm` |
| `resetPasswordSent()` | `() => string` | `ResetPasswordForm` |

| Export | Type | Description |
| ------ | ---- | ------------ |
| `AUTH_UI_MESSAGES` | `InjectionToken<AuthUiMessages>` | Defaults to `AUTH_UI_MESSAGES_EN`. Prefer `provideAuthUiMessages()` over providing this directly. |
| `provideAuthUiMessages(overrides)` | `(overrides: Partial<AuthUiMessages>) => Provider` | Registers a message override, merged on top of the English defaults. |
| `AUTH_UI_MESSAGES_EN` | `AuthUiMessages` | English preset (the default). |
| `AUTH_UI_MESSAGES_ES` | `AuthUiMessages` | Spanish preset. |

#### Theming

The form fields themselves (inputs, labels, submit button) are styled by
the `<lib-form-builder>` these components wrap internally, see
`@zhunam/form-builder`'s own Theming section. None of the properties
below are declared on `LoginForm`/`RegisterForm`/`ResetPasswordForm`'s
own `:host` either, so any of them can be set from `:root`, from a
wrapping element, or scoped directly to the component's own tag,
whichever is more convenient for your app. `LoginForm`, `RegisterForm`,
and `ResetPasswordForm` additionally read a few `--zhunam-*` custom
properties, part of the same shared namespace, for chrome that has no
`<lib-form-builder>` equivalent. Not every component uses every property
below:

| Custom property | Default | Description | Used by |
| ----------------- | -------- | -------------------------------------------- | -------------------------------------------- |
| `--zhunam-error`   | `#dc2626` | Error banner color, falls back to when `--zhunam-error-text` is unset. | `LoginForm`, `RegisterForm`, `ResetPasswordForm` |
| `--zhunam-error-text` | `var(--zhunam-error)` | Error banner text color specifically. | `LoginForm`, `RegisterForm`, `ResetPasswordForm` |
| `--zhunam-success` | `#16a34a` | Success message color, falls back to when `--zhunam-success-text` is unset. | `ResetPasswordForm` |
| `--zhunam-success-text` | `var(--zhunam-success)` | Success message text color specifically. | `ResetPasswordForm` |
| `--zhunam-primary` | `#3b82f6` | "Forgot your password?" link color, falls back to when `--zhunam-primary-text` is unset. | `LoginForm` |
| `--zhunam-primary-text` | `var(--zhunam-primary)` | "Forgot your password?" link color specifically. | `LoginForm` |
| `--zhunam-spacing` | `1rem`    | Top margin of the error/success/link chrome. | `LoginForm`, `RegisterForm`, `ResetPasswordForm` |

### Internationalization

`provideAuthUiMessages()` translates only the chrome specific to these 3
components (field labels, the "Forgot your password?" link, the
password-match and reset-sent messages). To translate a form
completely, also provide `FORM_BUILDER_MESSAGES` from
`@zhunam/form-builder`: the fields these components wrap render their
own validation text and submit button label through that separate
token.

```typescript
import { provideAuthUiMessages, AUTH_UI_MESSAGES_ES } from '@zhunam/auth/form-ui';
import { provideFormBuilderMessages, FORM_BUILDER_MESSAGES_ES } from '@zhunam/form-builder';

providers: [
  provideAuthUiMessages(AUTH_UI_MESSAGES_ES),
  provideFormBuilderMessages(FORM_BUILDER_MESSAGES_ES),
]
```

Every message is a function, called on every render rather than once at
startup, so one that reads a signal updates live. Field labels flow into
`<lib-form-builder>` through each component's own `fields`, itself a
`computed()` that re-reads `AUTH_UI_MESSAGES` on every change, same as
any other reactive input.

## Compatibility

| Peer dependency          | Range                                | Required for                        |
| -------------------------- | -------------------------------------- | -------------------------------------- |
| `@angular/core`             | `^20.0.0 \|\| ^21.0.0 \|\| ^22.0.0`     | Always                                 |
| `@angular/router`           | `^20.0.0 \|\| ^21.0.0 \|\| ^22.0.0`     | Always (`authGuard`)                   |
| `firebase`                  | `^10.0.0 \|\| ^11.0.0 \|\| ^12.0.0`     | Only if using `@zhunam/auth/firebase`  |
| `@supabase/supabase-js`     | `^2.0.0`                               | Only if using `@zhunam/auth/supabase`  |
| `@zhunam/form-builder`      | `^3.0.0`                               | Only if using `@zhunam/auth/form-ui`   |

## Security

- No authentication logic is implemented here. All sensitive work, credential checks, token issuance, session storage, lives in Firebase or Supabase, both audited, widely-used providers.
- `AuthUser` is deliberately minimal. It never exposes tokens, credentials, or any provider-specific metadata.
- `getIdToken()` is the only way to access the current ID token. It's never a passive property on `AuthUser` or `AuthService`, so it can't be read accidentally by code that only needed to check who's signed in.
- `ResetPasswordForm` always shows the same success message, whether the submitted email is registered or not. This is a deliberate anti-enumeration protection, not a missing feature; you can see it in action in the live demo.
- `AuthService.signUp()` with an email that's already registered doesn't always fail visibly the same way. Firebase always rejects with `AUTH_ERROR_CODES.emailAlreadyInUse`. Supabase's behavior depends on the project's own email/phone confirmation settings: with both enabled, it can instead resolve with an obfuscated, fake-looking user object rather than an error, by design on Supabase's side. This library doesn't try to paper over that difference: check your Supabase project's settings if you need a consistent signal.
- Switching providers (Firebase to Supabase or back) never requires touching your application code, thanks to the shared `AuthService` contract. There's no provider-specific type or behavior for your app to depend on.

## Why this one

Headless by design: `@zhunam/auth/form-ui` is entirely optional, the core never forces a UI on you. One contract across providers, so swapping Firebase for Supabase is a config change, not a rewrite. `authGuard` and reactive session state come ready to use out of the box. Real security work stays where it belongs, in providers that are already built and audited for it, instead of being reinvented here.

## License

MIT

---

Built by Ariana Mora · [LinkedIn](https://www.linkedin.com/in/ariana-andreina-mora) · [GitHub](https://github.com/zhunam)
