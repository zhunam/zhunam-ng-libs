import { ChangeDetectionStrategy, Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { FieldConfig, FormBuilder } from '@zhunam/form-builder';
import { AUTH_SERVICE } from '@zhunam/auth';

interface ResetPasswordFormValue {
  email: string;
}

const RESET_PASSWORD_FIELDS: FieldConfig<ResetPasswordFormValue>[] = [
  { key: 'email', label: 'Email', type: 'email', validators: { required: true, email: true } },
];

const GENERIC_SUCCESS_MESSAGE = "If that email is registered, you'll receive instructions to reset your password.";

// Firebase's sendPasswordResetEmail() throws this code by default for a
// non-existent email, unless the project has "Email enumeration
// protection" enabled in the console — which this library can't assume.
// Supabase's resetPasswordForEmail() already suppresses this server-side
// and never throws it, so the check below simply never triggers there;
// it's kept anyway so behavior stays identical regardless of provider.
const USER_NOT_FOUND_CODE = 'auth/user-not-found';

function isUserNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === USER_NOT_FOUND_CODE;
}

/**
 * Ready-to-use "forgot your password" form: a single email field, wired
 * to the `AUTH_SERVICE` provided by whichever provider entry point the
 * app registered (`@zhunam/auth/firebase` or `@zhunam/auth/supabase`).
 *
 * Always shows the same generic success message, whether the email is
 * registered or not; see the comment on `onSubmit` for why this isn't
 * optional UI polish.
 *
 * @example
 * <lib-reset-password-form />
 */
@Component({
  selector: 'lib-reset-password-form',
  imports: [FormBuilder],
  templateUrl: './reset-password-form.html',
  styleUrl: './reset-password-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
})
export class ResetPasswordForm {
  private readonly authService = inject(AUTH_SERVICE);

  protected readonly fields = RESET_PASSWORD_FIELDS;
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected async onSubmit(value: ResetPasswordFormValue): Promise<void> {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    try {
      await this.authService.resetPassword(value.email);
      this.successMessage.set(GENERIC_SUCCESS_MESSAGE);
    } catch (error) {
      // Deliberately identical to the success path for "user not found".
      // Differentiating the UI here — even just this once, even just for
      // a "nicer" message — would let an attacker tell registered emails
      // apart from unregistered ones by submitting this form and watching
      // which response they get. Don't "fix" this by showing the real
      // error for this specific case.
      if (isUserNotFoundError(error)) {
        this.successMessage.set(GENERIC_SUCCESS_MESSAGE);
        return;
      }
      // Any other failure (network error, rate limit, etc.) doesn't leak
      // whether the email is registered, so it's safe to show as-is.
      this.errorMessage.set(error instanceof Error ? error.message : String(error));
    }
  }
}
