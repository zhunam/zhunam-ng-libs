import { NgModule } from '@angular/core';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';
import { ResetPasswordForm } from './reset-password-form';

/**
 * NgModule wrapper for `LoginForm`, `RegisterForm`, and
 * `ResetPasswordForm`, for consumers still on a classic NgModule
 * architecture. All three standalone components are still the
 * recommended way to consume this entry point; import them directly
 * (`imports: [LoginForm, RegisterForm, ResetPasswordForm]`) unless your
 * app doesn't use standalone components yet.
 *
 * Bundled as a single module rather than one module per component
 * (LoginModule, RegisterModule, ResetPasswordModule): a typical auth
 * flow uses all three together, and a classic NgModule consumer
 * reaching for this entry point almost certainly wants login,
 * register, and password reset in one import, not three. This doesn't
 * cost anything unused ones would otherwise avoid either: Angular's
 * build tree-shakes each standalone component individually based on
 * what your templates actually reference, not on what an NgModule
 * happens to list in `exports`.
 *
 * @example
 * @NgModule({
 *   imports: [AuthFormsModule],
 * })
 * export class AuthPageModule {}
 */
@NgModule({
  imports: [LoginForm, RegisterForm, ResetPasswordForm],
  exports: [LoginForm, RegisterForm, ResetPasswordForm],
})
export class AuthFormsModule {}
