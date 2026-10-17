/**
 * Storage adapter the Supabase client persists the session through.
 * Each method may return its value directly (like `localStorage`) or a
 * `Promise` of it, e.g. an adapter that forwards to an Electron main
 * process over IPC.
 *
 * The values passed to `setItem` contain the session's access and
 * refresh tokens: an adapter must never log them.
 */
export interface SupabaseAuthStorage {
  /** Returns the stored value for `key`, or `null` if there is none. */
  getItem(key: string): string | null | Promise<string | null>;

  /** Stores `value` under `key`. */
  setItem(key: string, value: string): void | Promise<void>;

  /** Removes the value stored under `key`. */
  removeItem(key: string): void | Promise<void>;
}

/**
 * Auth options forwarded as-is to the Supabase client's `auth` options.
 * Every field is optional: anything left out keeps Supabase's own
 * default.
 */
export interface SupabaseAuthClientOptions {
  /**
   * Where the session is persisted.
   * @default window.localStorage
   */
  storage?: SupabaseAuthStorage;

  /**
   * Key the session is stored under in `storage`.
   * @default `sb-<project-ref>-auth-token`
   */
  storageKey?: string;

  /**
   * Whether the session is persisted to `storage` at all.
   * @default true
   */
  persistSession?: boolean;

  /**
   * Whether the access token is refreshed automatically before it expires.
   * @default true
   */
  autoRefreshToken?: boolean;

  /**
   * Whether the client reads a session from the page URL on startup
   * (OAuth callbacks, email links).
   * @default true
   */
  detectSessionInUrl?: boolean;

  /**
   * Auth flow used for email links and OAuth. `'pkce'` requires
   * `@supabase/supabase-js` 2.21 or later; older 2.x versions ignore it.
   * @default 'implicit'
   */
  flowType?: 'implicit' | 'pkce';
}

/**
 * Minimal Supabase project configuration needed to initialize Auth.
 *
 * `anonKey` (like Firebase's `apiKey`) is not a secret: real protection
 * comes from your project's Row Level Security policies, not from hiding
 * this value. Still, it must come from `environment.ts` /
 * `environment.production.ts` in the consuming app, never hardcoded in
 * versioned source, same as any other build config.
 */
export interface SupabaseAuthConfig {
  /** Supabase project URL, e.g. `https://your-project.supabase.co`. */
  url: string;

  /** Supabase anonymous (public) API key for this project. */
  anonKey: string;

  /**
   * Auth options for the underlying Supabase client, e.g. a custom
   * `storage` adapter for environments where `localStorage` isn't the
   * right place for the session (Electron, Capacitor).
   * @default undefined (Supabase's own defaults)
   * @example
   * provideSupabaseAuth({
   *   url: environment.supabase.url,
   *   anonKey: environment.supabase.anonKey,
   *   auth: { storage: ipcSessionStorage, detectSessionInUrl: false },
   * });
   */
  auth?: SupabaseAuthClientOptions;
}
