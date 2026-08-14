import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AUTH_SERVICE, AuthService, AuthUser } from '@zhunam/auth';
import { FormBuilder } from '@zhunam/form-builder';
import { LoginForm } from './login-form';

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

function createFixture(authService: AuthService): ComponentFixture<LoginForm> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), { provide: AUTH_SERVICE, useValue: authService }],
  });
  const fixture = TestBed.createComponent(LoginForm);
  fixture.detectChanges();
  return fixture;
}

function submitLoginForm(fixture: ComponentFixture<LoginForm>, value: { email: string; password: string }): void {
  const formBuilderDebugEl = fixture.debugElement.query((de) => de.componentInstance instanceof FormBuilder);
  formBuilderDebugEl.triggerEventHandler('formSubmit', value);
  fixture.detectChanges();
}

describe('LoginForm', () => {
  it('creates', () => {
    const fixture = createFixture(createAuthServiceMock());
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('calls AuthService.signIn with the submitted credentials and emits loginSuccess on success', async () => {
    const authService = createAuthServiceMock();
    const user: AuthUser = { uid: 'uid-1', email: 'user@example.com', emailVerified: true, displayName: null };
    (authService.signIn as ReturnType<typeof vi.fn>).mockResolvedValue(user);
    const fixture = createFixture(authService);
    const emitted: AuthUser[] = [];
    fixture.componentInstance.loginSuccess.subscribe((emittedUser) => emitted.push(emittedUser));

    submitLoginForm(fixture, { email: 'user@example.com', password: 'secret' });
    await fixture.whenStable();

    expect(authService.signIn).toHaveBeenCalledWith('user@example.com', 'secret');
    expect(emitted).toEqual([user]);
  });

  it('shows the AuthService error message as-is when signIn rejects', async () => {
    const authService = createAuthServiceMock();
    (authService.signIn as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid login credentials'));
    const fixture = createFixture(authService);

    submitLoginForm(fixture, { email: 'user@example.com', password: 'wrong' });
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = (fixture.nativeElement as HTMLElement).querySelector('.auth-error');
    expect(errorEl?.textContent?.trim()).toBe('Invalid login credentials');
  });

  it('stringifies a non-Error rejection for the error message', async () => {
    const authService = createAuthServiceMock();
    (authService.signIn as ReturnType<typeof vi.fn>).mockRejectedValue('rejected without an Error object');
    const fixture = createFixture(authService);

    submitLoginForm(fixture, { email: 'user@example.com', password: 'wrong' });
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = (fixture.nativeElement as HTMLElement).querySelector('.auth-error');
    expect(errorEl?.textContent?.trim()).toBe('rejected without an Error object');
  });

  it('emits forgotPasswordClick when the link is clicked, without navigating itself', () => {
    const fixture = createFixture(createAuthServiceMock());
    const emitted: void[] = [];
    fixture.componentInstance.forgotPasswordClick.subscribe(() => emitted.push(undefined));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.auth-link-button')?.click();

    expect(emitted.length).toBe(1);
  });
});
