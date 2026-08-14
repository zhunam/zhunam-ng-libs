import { ChangeDetectionStrategy, Component, inject, output, signal, ViewEncapsulation } from '@angular/core';
import { FieldConfig, FormBuilder } from '@zhunam/form-builder';
import { AUTH_SERVICE, AuthUser } from '@zhunam/auth';

interface LoginFormValue {
  email: string;
  password: string;
}

const LOGIN_FIELDS: FieldConfig<LoginFormValue>[] = [
  { key: 'email', label: 'Email', type: 'email', validators: { required: true, email: true } },
  { key: 'password', label: 'Password', type: 'password', validators: { required: true } },
];

/**
 * Ready-to-use login form: email + password, wired to the `AUTH_SERVICE`
 * provided by whichever provider entry point the app registered
 * (`@zhunam/auth/firebase` or `@zhunam/auth/supabase`).
 *
 * Has no routing opinion — it emits `forgotPasswordClick` and leaves
 * navigation entirely to the consumer.
 *
 * @example
 * <lib-login-form
 *   (loginSuccess)="onLoginSuccess($event)"
 *   (forgotPasswordClick)="router.navigate(['/reset-password'])"
 * />
 */
@Component({
  selector: 'lib-login-form',
  imports: [FormBuilder],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
})
export class LoginForm {
  private readonly authService = inject(AUTH_SERVICE);

  protected readonly fields = LOGIN_FIELDS;
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Emitted with the signed-in user right after a successful login.
   *
   * @example
   * <lib-login-form (loginSuccess)="onLoginSuccess($event)" />
   */
  loginSuccess = output<AuthUser>();

  /**
   * Emitted when the user clicks "Forgot your password?". This library
   * has no routing opinion — the consumer decides how (or whether) to
   * navigate to a reset-password screen.
   *
   * @example
   * <lib-login-form (forgotPasswordClick)="router.navigate(['/reset-password'])" />
   */
  forgotPasswordClick = output<void>();

  protected async onSubmit(value: LoginFormValue): Promise<void> {
    this.errorMessage.set(null);
    try {
      const user = await this.authService.signIn(value.email, value.password);
      this.loginSuccess.emit(user);
    } catch (error) {
      // Firebase/Supabase error messages are deliberately written not to
      // leak whether an email is registered — shown as-is, never reworded.
      this.errorMessage.set(error instanceof Error ? error.message : String(error));
    }
  }
}
