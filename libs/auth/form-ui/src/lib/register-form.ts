import { ChangeDetectionStrategy, Component, computed, inject, output, signal, ViewEncapsulation } from '@angular/core';
import { CrossFieldValidator, FieldConfig, FormBuilder } from '@zhunam/form-builder';
import { AUTH_SERVICE, AuthUser } from '@zhunam/auth';
import { AUTH_UI_MESSAGES } from './tokens/auth-ui-messages.token';

interface RegisterFormValue {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Ready-to-use registration form: email + password + confirm password
 * (cross-field validated to match), wired to the `AUTH_SERVICE` provided
 * by whichever provider entry point the app registered
 * (`@zhunam/auth/firebase` or `@zhunam/auth/supabase`).
 *
 * @example
 * <lib-register-form (registerSuccess)="onRegisterSuccess($event)" />
 */
@Component({
  selector: 'lib-register-form',
  imports: [FormBuilder],
  templateUrl: './register-form.html',
  styleUrl: './register-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
})
export class RegisterForm {
  private readonly authService = inject(AUTH_SERVICE);
  protected readonly messages = inject(AUTH_UI_MESSAGES);

  protected readonly fields = computed<FieldConfig<RegisterFormValue>[]>(() => [
    { key: 'email', label: this.messages.emailLabel(), type: 'email', validators: { required: true, email: true } },
    {
      key: 'password',
      label: this.messages.passwordLabel(),
      type: 'password',
      validators: { required: true, minLength: 8 },
    },
    {
      key: 'confirmPassword',
      label: this.messages.confirmPasswordLabel(),
      type: 'password',
      validators: { required: true },
    },
  ]);

  // Built per instance (not a module constant) so its message reads
  // AUTH_UI_MESSAGES fresh every time FormBuilder runs it, instead of
  // capturing whatever language was active when the module first loaded.
  protected readonly crossFieldValidators = computed<CrossFieldValidator<RegisterFormValue>[]>(() => [
    {
      validate: (value) =>
        value.password !== value.confirmPassword ? { confirmPassword: this.messages.passwordsMustMatch() } : null,
    },
  ]);

  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Emitted with the newly created user right after a successful sign-up.
   *
   * @example
   * <lib-register-form (registerSuccess)="onRegisterSuccess($event)" />
   */
  registerSuccess = output<AuthUser>();

  protected async onSubmit(value: RegisterFormValue): Promise<void> {
    this.errorMessage.set(null);
    try {
      const user = await this.authService.signUp(value.email, value.password);
      this.registerSuccess.emit(user);
    } catch (error) {
      // Same rationale as LoginForm: provider error messages are shown
      // as-is, never reworded — see login-form.ts for the full note.
      this.errorMessage.set(error instanceof Error ? error.message : String(error));
    }
  }
}
