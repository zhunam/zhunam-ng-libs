import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AUTH_SERVICE, AuthService } from '@zhunam/auth';
import { FormBuilder } from '@zhunam/form-builder';
import { ResetPasswordForm } from './reset-password-form';

const GENERIC_SUCCESS_MESSAGE = "If that email is registered, you'll receive instructions to reset your password.";

function createAuthServiceMock(): AuthService {
  return {
    currentUser: vi.fn(),
    isAuthenticated: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    getIdToken: vi.fn(),
  } as unknown as AuthService;
}

function createFixture(authService: AuthService): ComponentFixture<ResetPasswordForm> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), { provide: AUTH_SERVICE, useValue: authService }],
  });
  const fixture = TestBed.createComponent(ResetPasswordForm);
  fixture.detectChanges();
  return fixture;
}

async function submitResetForm(fixture: ComponentFixture<ResetPasswordForm>, email: string): Promise<void> {
  const formBuilderDebugEl = fixture.debugElement.query((de) => de.componentInstance instanceof FormBuilder);
  formBuilderDebugEl.triggerEventHandler('formSubmit', { email });
  await fixture.whenStable();
  fixture.detectChanges();
}

function messageText(fixture: ComponentFixture<ResetPasswordForm>, selector: string): string | null {
  const el = (fixture.nativeElement as HTMLElement).querySelector(selector);
  return el?.textContent?.trim() ?? null;
}

describe('ResetPasswordForm', () => {
  it('creates', () => {
    const fixture = createFixture(createAuthServiceMock());
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('calls AuthService.resetPassword with the submitted email and shows the generic success message', async () => {
    const authService = createAuthServiceMock();
    (authService.resetPassword as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const fixture = createFixture(authService);

    await submitResetForm(fixture, 'user@example.com');

    expect(authService.resetPassword).toHaveBeenCalledWith('user@example.com');
    expect(messageText(fixture, '.auth-success')).toBe(GENERIC_SUCCESS_MESSAGE);
  });

  it('SECURITY: shows the exact same success message when the provider rejects with "user not found", instead of a different one', async () => {
    const authService = createAuthServiceMock();
    (authService.resetPassword as ReturnType<typeof vi.fn>).mockRejectedValue({
      code: 'auth/user-not-found',
      message: 'There is no user record corresponding to this identifier.',
    });
    const fixture = createFixture(authService);

    await submitResetForm(fixture, 'unregistered@example.com');

    // Must be byte-for-byte identical to the resolved case above — any
    // difference here (wording, presence, timing) is an enumeration leak.
    expect(messageText(fixture, '.auth-success')).toBe(GENERIC_SUCCESS_MESSAGE);
    expect(messageText(fixture, '.auth-error')).toBeNull();
  });

  it('shows the real error for failures unrelated to whether the user exists', async () => {
    const authService = createAuthServiceMock();
    (authService.resetPassword as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network request failed'));
    const fixture = createFixture(authService);

    await submitResetForm(fixture, 'user@example.com');

    expect(messageText(fixture, '.auth-error')).toBe('Network request failed');
    expect(messageText(fixture, '.auth-success')).toBeNull();
  });

  it('stringifies a non-Error rejection for the error message', async () => {
    const authService = createAuthServiceMock();
    (authService.resetPassword as ReturnType<typeof vi.fn>).mockRejectedValue('rejected without an Error object');
    const fixture = createFixture(authService);

    await submitResetForm(fixture, 'user@example.com');

    expect(messageText(fixture, '.auth-error')).toBe('rejected without an Error object');
  });
});
