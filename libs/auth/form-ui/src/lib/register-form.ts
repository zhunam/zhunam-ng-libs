import { ChangeDetectionStrategy, Component, inject, output, signal, ViewEncapsulation } from '@angular/core';
import { CrossFieldValidator, FieldConfig, FormBuilder } from '@zhunam/form-builder';
import { AUTH_SERVICE, AuthUser } from '@zhunam/auth';

interface RegisterFormValue {
  email: string;
  password: string;
  confirmPassword: string;
}

const REGISTER_FIELDS: FieldConfig<RegisterFormValue>[] = [
  { key: 'email', label: 'Email', type: 'email', validators: { required: true, email: true } },
  { key: 'password', label: 'Password', type: 'password', validators: { required: true, minLength: 8 } },
  { key: 'confirmPassword', label: 'Confirm password', type: 'password', validators: { required: true } },
];

const PASSWORDS_MATCH_VALIDATOR: CrossFieldValidator<RegisterFormValue> = {
  validate: (value) => (value.password !== value.confirmPassword ? { confirmPassword: 'Passwords must match' } : null),
};

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

  protected readonly fields = REGISTER_FIELDS;
  protected readonly crossFieldValidators = [PASSWORDS_MATCH_VALIDATOR];
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Emitted with the newly created user right after a successful sign-up.
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
