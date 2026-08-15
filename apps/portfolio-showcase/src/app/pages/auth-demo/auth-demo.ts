import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AUTH_SERVICE, AuthUser } from '@zhunam/auth';
import { LoginForm, RegisterForm, ResetPasswordForm } from '@zhunam/auth/form-ui';
import { libraries } from '../../shared/libraries';
import { injectCurrentUrl, sidebarLinkClasses } from '../../shared/library-sidebar';
import { DEMO_EMAIL, DEMO_PASSWORD, MockAuthService } from './mock-auth.service';

type Provider = 'firebase' | 'supabase';

@Component({
  selector: 'app-auth-demo',
  imports: [RouterLink, LoginForm, RegisterForm, ResetPasswordForm],
  templateUrl: './auth-demo.html',
  styleUrl: './auth-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // In-memory only — see mock-auth.service.ts. Never provideFirebaseAuth/
  // provideSupabaseAuth here: this page must never touch a real SDK or a
  // real credential.
  providers: [{ provide: AUTH_SERVICE, useClass: MockAuthService }],
})
export class AuthDemo {
  protected readonly libraries = libraries;
  protected readonly currentUrl = injectCurrentUrl();
  protected readonly sidebarLinkClasses = sidebarLinkClasses;

  protected readonly authService = inject(AUTH_SERVICE);
  protected readonly demoEmail = DEMO_EMAIL;
  protected readonly demoPassword = DEMO_PASSWORD;
  protected readonly selectedProvider = signal<Provider>('firebase');

  protected readonly authGuardSnippet = `// Illustrative only — this demo page has no real routing, but this is
// exactly how you'd protect a route in your own app:
import { authGuard } from '@zhunam/auth';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
];`;

  protected usageSnippet(): string {
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
};`;
  }

  protected onLoginSuccess(user: AuthUser): void {
    console.info('loginSuccess', user);
  }

  protected onRegisterSuccess(user: AuthUser): void {
    console.info('registerSuccess', user);
  }

  protected signOut(): void {
    void this.authService.signOut();
  }
}
