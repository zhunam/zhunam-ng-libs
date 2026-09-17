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
| `signIn(email, password)`               | `Promise<AuthUser>`        | Signs in an existing user.                          |
| `signUp(email, password)`               | `Promise<AuthUser>`        | Creates a new user account.                         |
| `signOut()`                              | `Promise<void>`            | Signs out the current user.                         |
| `resetPassword(email)`                  | `Promise<void>`            | Sends a password reset email via the provider's native flow. |
| `getIdToken()`                          | `Promise<string \| null>`  | Fresh ID token for authenticated HTTP calls, `null` if signed out. |

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

#### Theming

The form fields themselves (inputs, labels, submit button) are styled by
the `<lib-form-builder>` these components wrap internally, see
`@zhunam/form-builder`'s own Theming section. `LoginForm`,
`RegisterForm`, and `ResetPasswordForm` additionally read a few
`--zhunam-*` custom properties, part of the same shared namespace, for
chrome that has no `<lib-form-builder>` equivalent. Not every component
uses every property below:

| Custom property | Default | Description | Used by |
| ----------------- | -------- | -------------------------------------------- | -------------------------------------------- |
| `--zhunam-error`   | `#dc2626` | Error banner text color. | `LoginForm`, `RegisterForm`, `ResetPasswordForm` |
| `--zhunam-success` | `#16a34a` | Success message text color. | `ResetPasswordForm` |
| `--zhunam-primary` | `#3b82f6` | "Forgot your password?" link color. | `LoginForm` |
| `--zhunam-spacing` | `1rem`    | Top margin of the error/success/link chrome. | `LoginForm`, `RegisterForm`, `ResetPasswordForm` |

## Compatibility

| Peer dependency          | Range                                | Required for                        |
| -------------------------- | -------------------------------------- | -------------------------------------- |
| `@angular/core`             | `^20.0.0 \|\| ^21.0.0 \|\| ^22.0.0`     | Always                                 |
| `@angular/router`           | `^20.0.0 \|\| ^21.0.0 \|\| ^22.0.0`     | Always (`authGuard`)                   |
| `firebase`                  | `^10.0.0 \|\| ^11.0.0 \|\| ^12.0.0`     | Only if using `@zhunam/auth/firebase`  |
| `@supabase/supabase-js`     | `^2.0.0`                               | Only if using `@zhunam/auth/supabase`  |
| `@zhunam/form-builder`      | `^2.0.0`                               | Only if using `@zhunam/auth/form-ui`   |

## Security

- No authentication logic is implemented here. All sensitive work, credential checks, token issuance, session storage, lives in Firebase or Supabase, both audited, widely-used providers.
- `AuthUser` is deliberately minimal. It never exposes tokens, credentials, or any provider-specific metadata.
- `getIdToken()` is the only way to access the current ID token. It's never a passive property on `AuthUser` or `AuthService`, so it can't be read accidentally by code that only needed to check who's signed in.
- `ResetPasswordForm` always shows the same success message, whether the submitted email is registered or not. This is a deliberate anti-enumeration protection, not a missing feature; you can see it in action in the live demo.
- Switching providers (Firebase to Supabase or back) never requires touching your application code, thanks to the shared `AuthService` contract. There's no provider-specific type or behavior for your app to depend on.

## Why this one

Headless by design: `@zhunam/auth/form-ui` is entirely optional, the core never forces a UI on you. One contract across providers, so swapping Firebase for Supabase is a config change, not a rewrite. `authGuard` and reactive session state come ready to use out of the box. Real security work stays where it belongs, in providers that are already built and audited for it, instead of being reinvented here.

## License

MIT

---

Built by Ariana Mora · [LinkedIn](https://www.linkedin.com/in/ariana-andreina-mora) · [GitHub](https://github.com/zhunam)
