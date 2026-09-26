/**
 * Translatable strings `LoginForm`, `RegisterForm`, and
 * `ResetPasswordForm` render. Every member is a function, called fresh on
 * every render, so a message that reads a signal (e.g. a language
 * switcher) updates live without recreating the component.
 *
 * To translate a form completely, also provide `FORM_BUILDER_MESSAGES`
 * from `@zhunam/form-builder`: the fields themselves (validation
 * messages, the submit button) are rendered by the `<lib-form-builder>`
 * these components wrap internally, this token only covers the chrome
 * that's specific to `@zhunam/auth/form-ui`.
 */
export interface AuthUiMessages {
  /**
   * Label of the email field, shared by all 3 forms.
   */
  emailLabel(): string;

  /**
   * Label of the password field, in `LoginForm` and `RegisterForm`.
   */
  passwordLabel(): string;

  /**
   * Label of the confirm-password field, in `RegisterForm`.
   */
  confirmPasswordLabel(): string;

  /**
   * "Forgot your password?" link text, in `LoginForm`.
   */
  forgotPassword(): string;

  /**
   * Cross-field validation message shown in `RegisterForm` when password
   * and confirm password don't match.
   */
  passwordsMustMatch(): string;

  /**
   * Generic success message shown by `ResetPasswordForm` regardless of
   * whether the submitted email is actually registered, deliberately
   * identical either way (anti-enumeration protection).
   */
  resetPasswordSent(): string;
}

/**
 * Default English messages. Used when no `AUTH_UI_MESSAGES` provider is
 * registered.
 */
export const AUTH_UI_MESSAGES_EN: AuthUiMessages = {
  emailLabel: () => 'Email',
  passwordLabel: () => 'Password',
  confirmPasswordLabel: () => 'Confirm password',
  forgotPassword: () => 'Forgot your password?',
  passwordsMustMatch: () => 'Passwords must match',
  resetPasswordSent: () => "If that email is registered, you'll receive instructions to reset your password.",
};

/**
 * Spanish preset, ready to pass to `provideAuthUiMessages()`.
 * @example
 * providers: [provideAuthUiMessages(AUTH_UI_MESSAGES_ES)]
 */
export const AUTH_UI_MESSAGES_ES: AuthUiMessages = {
  emailLabel: () => 'Correo electrónico',
  passwordLabel: () => 'Contraseña',
  confirmPasswordLabel: () => 'Confirmar contraseña',
  forgotPassword: () => '¿Olvidaste tu contraseña?',
  passwordsMustMatch: () => 'Las contraseñas deben coincidir',
  resetPasswordSent: () => 'Si ese email está registrado, recibirás instrucciones para restablecer tu contraseña.',
};
