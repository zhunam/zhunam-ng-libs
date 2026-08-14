import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AUTH_SERVICE, AuthService, AuthUser } from '@zhunam/auth';
import { FormBuilder } from '@zhunam/form-builder';
import { RegisterForm } from './register-form';

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

function createFixture(authService: AuthService): ComponentFixture<RegisterForm> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), { provide: AUTH_SERVICE, useValue: authService }],
  });
  const fixture = TestBed.createComponent(RegisterForm);
  fixture.detectChanges();
  return fixture;
}

function submitRegisterForm(
  fixture: ComponentFixture<RegisterForm>,
  value: { email: string; password: string; confirmPassword: string },
): void {
  const formBuilderDebugEl = fixture.debugElement.query((de) => de.componentInstance instanceof FormBuilder);
  formBuilderDebugEl.triggerEventHandler('formSubmit', value);
  fixture.detectChanges();
}

describe('RegisterForm', () => {
  it('creates', () => {
    const fixture = createFixture(createAuthServiceMock());
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('calls AuthService.signUp with the submitted credentials and emits registerSuccess on success', async () => {
    const authService = createAuthServiceMock();
    const user: AuthUser = { uid: 'uid-1', email: 'new@example.com', emailVerified: false, displayName: null };
    (authService.signUp as ReturnType<typeof vi.fn>).mockResolvedValue(user);
    const fixture = createFixture(authService);
    const emitted: AuthUser[] = [];
    fixture.componentInstance.registerSuccess.subscribe((emittedUser) => emitted.push(emittedUser));

    submitRegisterForm(fixture, { email: 'new@example.com', password: 'secret123', confirmPassword: 'secret123' });
    await fixture.whenStable();

    expect(authService.signUp).toHaveBeenCalledWith('new@example.com', 'secret123');
    expect(emitted).toEqual([user]);
  });

  it('shows the AuthService error message as-is when signUp rejects', async () => {
    const authService = createAuthServiceMock();
    (authService.signUp as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Email already in use'));
    const fixture = createFixture(authService);

    submitRegisterForm(fixture, { email: 'new@example.com', password: 'secret123', confirmPassword: 'secret123' });
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = (fixture.nativeElement as HTMLElement).querySelector('.auth-error');
    expect(errorEl?.textContent?.trim()).toBe('Email already in use');
  });

  it('stringifies a non-Error rejection for the error message', async () => {
    const authService = createAuthServiceMock();
    (authService.signUp as ReturnType<typeof vi.fn>).mockRejectedValue('rejected without an Error object');
    const fixture = createFixture(authService);

    submitRegisterForm(fixture, { email: 'new@example.com', password: 'secret123', confirmPassword: 'secret123' });
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = (fixture.nativeElement as HTMLElement).querySelector('.auth-error');
    expect(errorEl?.textContent?.trim()).toBe('rejected without an Error object');
  });

  it('passes a cross-field validator to lib-form-builder that flags mismatched passwords', () => {
    const fixture = createFixture(createAuthServiceMock());

    const formBuilderDebugEl = fixture.debugElement.query((de) => de.componentInstance instanceof FormBuilder);
    const validators = formBuilderDebugEl.componentInstance.crossFieldValidators();

    expect(validators).toHaveLength(1);
    expect(validators[0].validate({ password: 'a', confirmPassword: 'b' })).toEqual({
      confirmPassword: 'Passwords must match',
    });
    expect(validators[0].validate({ password: 'a', confirmPassword: 'a' })).toBeNull();
  });
});
