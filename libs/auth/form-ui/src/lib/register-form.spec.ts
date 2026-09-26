import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AUTH_SERVICE, AuthService, AuthUser } from '@zhunam/auth';
import { FormBuilder } from '@zhunam/form-builder';
import { RegisterForm } from './register-form';
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
): ComponentFixture<RegisterForm> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AUTH_SERVICE, useValue: authService },
      ...extraProviders,
    ],
  });
  const fixture = TestBed.createComponent(RegisterForm);
  fixture.detectChanges();
  return fixture;
}

function labelText(fixture: ComponentFixture<RegisterForm>, index: number): string | null {
  const labels = (fixture.nativeElement as HTMLElement).querySelectorAll('.fb-label');
  return labels[index]?.textContent?.trim() ?? null;
}

function crossFieldValidate(
  fixture: ComponentFixture<RegisterForm>,
  value: { password: string; confirmPassword: string },
): Record<string, string> | null {
  const formBuilderDebugEl = fixture.debugElement.query((de) => de.componentInstance instanceof FormBuilder);
  const validators = formBuilderDebugEl.componentInstance.crossFieldValidators();
  return validators[0].validate(value);
}

function submitRegisterForm(
  fixture: ComponentFixture<RegisterForm>,
  value: { email: string; password: string; confirmPassword: string },
): void {
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
    await flushMicrotasks();

    expect(authService.signUp).toHaveBeenCalledWith('new@example.com', 'secret123');
    expect(emitted).toEqual([user]);
  });

  it('shows the AuthService error message as-is when signUp rejects', async () => {
    const authService = createAuthServiceMock();
    (authService.signUp as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Email already in use'));
    const fixture = createFixture(authService);

    submitRegisterForm(fixture, { email: 'new@example.com', password: 'secret123', confirmPassword: 'secret123' });
    await fixture.whenStable();
    await flushMicrotasks();
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
    await flushMicrotasks();
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

  describe('i18n', () => {
    it('renders English labels by default, with no AUTH_UI_MESSAGES provider', () => {
      const fixture = createFixture(createAuthServiceMock());

      expect(labelText(fixture, 0)).toBe('Email');
      expect(labelText(fixture, 1)).toBe('Password');
      expect(labelText(fixture, 2)).toBe('Confirm password');
    });

    it('renders the Spanish preset with provideAuthUiMessages(AUTH_UI_MESSAGES_ES)', () => {
      const fixture = createFixture(createAuthServiceMock(), [provideAuthUiMessages(AUTH_UI_MESSAGES_ES)]);

      expect(labelText(fixture, 0)).toBe('Correo electrónico');
      expect(labelText(fixture, 1)).toBe('Contraseña');
      expect(labelText(fixture, 2)).toBe('Confirmar contraseña');
    });

    it('updates labels live when a message reads a signal, without recreating the component', () => {
      const lang = signal<'en' | 'es'>('en');
      const fixture = createFixture(createAuthServiceMock(), [
        provideAuthUiMessages({
          emailLabel: () => (lang() === 'en' ? 'Email' : 'Correo electrónico'),
        }),
      ]);
      const instance = fixture.componentInstance;

      expect(labelText(fixture, 0)).toBe('Email');

      lang.set('es');
      fixture.detectChanges();

      expect(fixture.componentInstance).toBe(instance);
      expect(labelText(fixture, 0)).toBe('Correo electrónico');
    });

    it('picks up a live language change in the crossFieldValidators() message on its next run, without recreating the component', () => {
      // PASSWORDS_MATCH_VALIDATOR is built per instance (a computed(), not
      // a module constant): the validate() function it produces reads
      // AUTH_UI_MESSAGES fresh every time FormBuilder calls it, which is
      // on every submit attempt. It is not re-evaluated retroactively on
      // an error already on screen without a new submit, the same
      // limitation crossFieldErrors already has for any FormBuilder
      // consumer (F11, out of scope for this block).
      const lang = signal<'en' | 'es'>('en');
      const fixture = createFixture(createAuthServiceMock(), [
        provideAuthUiMessages({
          passwordsMustMatch: () => (lang() === 'en' ? 'Passwords must match' : 'Las contraseñas deben coincidir'),
        }),
      ]);
      const instance = fixture.componentInstance;

      expect(crossFieldValidate(fixture, { password: 'a', confirmPassword: 'b' })).toEqual({
        confirmPassword: 'Passwords must match',
      });

      lang.set('es');
      fixture.detectChanges();

      expect(fixture.componentInstance).toBe(instance);
      expect(crossFieldValidate(fixture, { password: 'a', confirmPassword: 'b' })).toEqual({
        confirmPassword: 'Las contraseñas deben coincidir',
      });
    });

    it('shows the translated "Passwords must match" message visibly in the DOM after a real submit with mismatched passwords', () => {
      const fixture = createFixture(createAuthServiceMock(), [provideAuthUiMessages(AUTH_UI_MESSAGES_ES)]);
      const root = fixture.nativeElement as HTMLElement;
      // The native FormGroup must be valid on its own (email + a
      // long-enough password) before FormBuilder even runs the
      // cross-field check, see onSubmit()'s `if (group.invalid) return`.
      const emailInput = root.querySelector<HTMLInputElement>('input[type="email"]') as HTMLInputElement;
      const [passwordInput, confirmInput] = Array.from(
        root.querySelectorAll<HTMLInputElement>('input[type="password"]'),
      );

      emailInput.value = 'new@example.com';
      emailInput.dispatchEvent(new Event('input'));
      passwordInput.value = 'secret123';
      passwordInput.dispatchEvent(new Event('input'));
      confirmInput.value = 'different123';
      confirmInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();

      const errorText = root.querySelector('.fb-error')?.textContent?.trim();
      expect(errorText).toBe('Las contraseñas deben coincidir');
    });
  });
});
