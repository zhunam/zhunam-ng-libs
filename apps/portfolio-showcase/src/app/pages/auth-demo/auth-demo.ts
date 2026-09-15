import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AUTH_SERVICE, AuthUser } from '@zhunam/auth';
import { LoginForm, RegisterForm, ResetPasswordForm } from '@zhunam/auth/form-ui';
import { LibraryPageShell } from '../../shared/library-page-shell/library-page-shell';
import { PackageInfoCard } from '../../shared/package-info-card/package-info-card';
import { authLibrary } from '../../shared/libraries';
import { AuthStateSource, DEMO_EMAIL, DEMO_PASSWORD, MockAuthService } from './mock-auth.service';

type Provider = 'firebase' | 'supabase';

const STATE_SOURCE_LABEL: Record<AuthStateSource, string> = {
  login: 'Signed in via Login',
  register: 'Signed in via Register',
  signout: 'Signed out',
};

@Component({
  selector: 'app-auth-demo',
  imports: [RouterLink, LoginForm, RegisterForm, ResetPasswordForm, LibraryPageShell, PackageInfoCard],
  templateUrl: './auth-demo.html',
  styleUrl: './auth-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // In-memory only — see mock-auth.service.ts. Never provideFirebaseAuth/
  // provideSupabaseAuth here: this page must never touch a real SDK or a
  // real credential.
  providers: [
    { provide: AUTH_SERVICE, useClass: MockAuthService },
    // form-ui components only ever see the AUTH_SERVICE token, typed to
    // the public AuthService contract. This page additionally injects
    // the concrete class (same singleton instance) to read its
    // demo-only extras — lastStateSource and the per-action *Result
    // signals — that the real library has no equivalent of.
    { provide: MockAuthService, useExisting: AUTH_SERVICE },
  ],
})
export class AuthDemo {
  protected readonly library = authLibrary;
  protected readonly authService = inject(AUTH_SERVICE);
  protected readonly mockAuthService = inject(MockAuthService);
  protected readonly demoEmail = DEMO_EMAIL;
  protected readonly demoPassword = DEMO_PASSWORD;
  protected readonly selectedProvider = signal<Provider>('firebase');

  // Brief highlight on the Current state bar whenever the signed-in user
  // actually changes (sign-in, sign-up, or sign-out) — purely cosmetic,
  // resets itself, not worth more than a color transition.
  protected readonly stateChanged = signal(false);

  // Same technique, triggered by LoginForm's forgotPasswordClick instead
  // of a state change — scrolls to and briefly highlights the Reset
  // password section so the click's destination is obvious.
  protected readonly resetPasswordSectionEl = viewChild.required<ElementRef<HTMLElement>>('resetPasswordSection');
  protected readonly resetPasswordHighlight = signal(false);

  protected readonly headlessUsageSnippet = `// Any component or service in your own app, no form-ui import at all
import { Component, inject } from '@angular/core';
import { AUTH_SERVICE } from '@zhunam/auth';

@Component({ /* ... */ })
export class YourLoginComponent {
  private readonly authService = inject(AUTH_SERVICE);

  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isAuthenticated;

  async signIn(email: string, password: string) {
    const user = await this.authService.signIn(email, password);
    // build your own UI around \`user\` / currentUser() / isAuthenticated()
  }
}`;

  protected readonly authGuardSnippet = `// Illustrative only, this demo page has no real routing, but this is
// exactly how you'd protect a route in your own app:
import { authGuard } from '@zhunam/auth';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
];`;

  constructor() {
    let previousUid: string | null = null;
    effect(() => {
      const uid = this.authService.currentUser()?.uid ?? null;
      if (uid !== previousUid) {
        previousUid = uid;
        this.stateChanged.set(true);
        setTimeout(() => this.stateChanged.set(false), 600);
      }
    });
  }

  protected formUiUsageSnippet(): string {
    const provideFn = this.selectedProvider() === 'firebase' ? 'provideFirebaseAuth' : 'provideSupabaseAuth';
    const entryPoint = this.selectedProvider() === 'firebase' ? '@zhunam/auth/firebase' : '@zhunam/auth/supabase';
    const config =
      this.selectedProvider() === 'firebase'
        ? `{
      apiKey: environment.firebase.apiKey,
      authDomain: environment.firebase.authDomain,
      projectId: environment.firebase.projectId,
    }`
        : `{
      url: environment.supabase.url,
      anonKey: environment.supabase.anonKey,
    }`;

    return `// app.config.ts
import { ${provideFn} } from '${entryPoint}';

export const appConfig: ApplicationConfig = {
  providers: [
    ${provideFn}(${config}),
  ],
};

// your-login-page.html
<lib-login-form
  (loginSuccess)="onLoginSuccess($event)"
  (forgotPasswordClick)="router.navigate(['/reset-password'])"
/>`;
  }

  protected stateSourceLabel(source: AuthStateSource): string {
    return STATE_SOURCE_LABEL[source];
  }

  protected jsonOf(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  protected initial(user: AuthUser): string {
    return (user.displayName ?? user.email ?? '?').charAt(0).toUpperCase();
  }

  protected onLoginSuccess(user: AuthUser): void {
    console.info('loginSuccess', user);
  }

  protected onRegisterSuccess(user: AuthUser): void {
    console.info('registerSuccess', user);
  }

  protected onForgotPasswordClick(): void {
    this.resetPasswordSectionEl().nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.resetPasswordHighlight.set(true);
    setTimeout(() => this.resetPasswordHighlight.set(false), 1500);
  }

  protected signOut(): void {
    void this.authService.signOut();
  }
}
