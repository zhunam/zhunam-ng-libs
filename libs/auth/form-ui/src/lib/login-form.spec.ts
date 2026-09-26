import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AUTH_SERVICE, AuthService, AuthUser } from '@zhunam/auth';
import { FormBuilder } from '@zhunam/form-builder';
import { LoginForm } from './login-form';
import { AUTH_UI_MESSAGES_ES } from './models/auth-ui-messages';
import { provideAuthUiMessages } from './tokens/auth-ui-messages.token';

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

function createFixture(
  authService: AuthService,
  extraProviders: ReturnType<typeof provideAuthUiMessages>[] = [],
): ComponentFixture<LoginForm> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AUTH_SERVICE, useValue: authService },
      ...extraProviders,
    ],
  });
  const fixture = TestBed.createComponent(LoginForm);
  fixture.detectChanges();
  return fixture;
}

function labelText(fixture: ComponentFixture<LoginForm>, index: number): string | null {
  const labels = (fixture.nativeElement as HTMLElement).querySelectorAll('.fb-label');
  return labels[index]?.textContent?.trim() ?? null;
}

function linkButtonText(fixture: ComponentFixture<LoginForm>): string | null {
  return (fixture.nativeElement as HTMLElement).querySelector('.auth-link-button')?.textContent?.trim() ?? null;
}

function submitLoginForm(fixture: ComponentFixture<LoginForm>, value: { email: string; password: string }): void {
  const formBuilderDebugEl = fixture.debugElement.query((de) => de.componentInstance instanceof FormBuilder);
  formBuilderDebugEl.triggerEventHandler('formSubmit', value);
  fixture.detectChanges();
}

// Under zoneless testing, fixture.whenStable() only tracks Angular-aware
// work — a plain promise chain from a mocked AuthService method isn't
// registered with it and can still be pending when whenStable() resolves.
// A macrotask boundary guarantees every already-queued microtask has
// drained first, which whenStable() alone doesn't.
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
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
    await flushMicrotasks();

    expect(authService.signIn).toHaveBeenCalledWith('user@example.com', 'secret');
    expect(emitted).toEqual([user]);
  });

  it('shows the AuthService error message as-is when signIn rejects', async () => {
    const authService = createAuthServiceMock();
    (authService.signIn as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid login credentials'));
    const fixture = createFixture(authService);

    submitLoginForm(fixture, { email: 'user@example.com', password: 'wrong' });
    await fixture.whenStable();
    await flushMicrotasks();
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
    await flushMicrotasks();
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

  describe('i18n', () => {
    it('renders English labels and link text by default, with no AUTH_UI_MESSAGES provider', () => {
      const fixture = createFixture(createAuthServiceMock());

      expect(labelText(fixture, 0)).toBe('Email');
      expect(labelText(fixture, 1)).toBe('Password');
      expect(linkButtonText(fixture)).toBe('Forgot your password?');
    });

    it('renders the Spanish preset with provideAuthUiMessages(AUTH_UI_MESSAGES_ES)', () => {
      const fixture = createFixture(createAuthServiceMock(), [provideAuthUiMessages(AUTH_UI_MESSAGES_ES)]);

      expect(labelText(fixture, 0)).toBe('Correo electrónico');
      expect(labelText(fixture, 1)).toBe('Contraseña');
      expect(linkButtonText(fixture)).toBe('¿Olvidaste tu contraseña?');
    });

    it('updates labels and link text live when a message reads a signal, without recreating the component', () => {
      const lang = signal<'en' | 'es'>('en');
      const fixture = createFixture(createAuthServiceMock(), [
        provideAuthUiMessages({
          emailLabel: () => (lang() === 'en' ? 'Email' : 'Correo electrónico'),
          forgotPassword: () => (lang() === 'en' ? 'Forgot your password?' : '¿Olvidaste tu contraseña?'),
        }),
      ]);
      const instance = fixture.componentInstance;

      expect(labelText(fixture, 0)).toBe('Email');
      expect(linkButtonText(fixture)).toBe('Forgot your password?');

      lang.set('es');
      fixture.detectChanges();

      expect(fixture.componentInstance).toBe(instance);
      expect(labelText(fixture, 0)).toBe('Correo electrónico');
      expect(linkButtonText(fixture)).toBe('¿Olvidaste tu contraseña?');
    });
  });
});
