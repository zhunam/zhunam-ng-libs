import { inject, NgZone, Provider } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { AUTH_SERVICE } from '@zhunam/auth';
import { SupabaseAuthClientOptions, SupabaseAuthConfig } from './models/supabase-auth-config';
import { SupabaseAuthService } from './supabase-auth.service';

// supabase-js spreads these over its own defaults, so a key present with
// an `undefined` value (e.g. `{ persistSession: env.persist }` with the
// env value unset) would override the default instead of keeping it.
function withoutUndefined(options: SupabaseAuthClientOptions): SupabaseAuthClientOptions {
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
}

/**
 * Registers a Supabase Auth-backed implementation of `AuthService` under
 * the `AUTH_SERVICE` token, following the same "functional providers"
 * pattern as Angular's own `provideHttpClient`.
 *
 * Initializes the Supabase client internally: the consumer never touches
 * the Supabase SDK directly.
 *
 * @param config Minimal Supabase project config needed to initialize
 *   Auth. Read this from `environment.ts` in the consuming app, never
 *   hardcode it in versioned source (see `SupabaseAuthConfig` for why
 *   `anonKey` still shouldn't be hardcoded even though it isn't secret).
 *   `config.auth` is forwarded to the Supabase client's own `auth`
 *   options; when omitted, the client is created with Supabase's
 *   defaults, exactly as in 3.1.0.
 *
 * @example
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideSupabaseAuth({
 *       url: environment.supabase.url,
 *       anonKey: environment.supabase.anonKey,
 *     }),
 *   ],
 * };
 */
export function provideSupabaseAuth(config: SupabaseAuthConfig): Provider[] {
  return [
    {
      provide: AUTH_SERVICE,
      useFactory: () => {
        const client = config.auth
          ? createClient(config.url, config.anonKey, { auth: withoutUndefined(config.auth) })
          : createClient(config.url, config.anonKey);
        return new SupabaseAuthService(client, inject(NgZone));
      },
    },
  ];
}
