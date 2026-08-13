/**
 * Minimal Supabase project configuration needed to initialize Auth.
 *
 * `anonKey` (like Firebase's `apiKey`) is not a secret: real protection
 * comes from your project's Row Level Security policies, not from hiding
 * this value. Still, it must come from `environment.ts` /
 * `environment.production.ts` in the consuming app, never hardcoded in
 * versioned source — same as any other build config.
 */
export interface SupabaseAuthConfig {
  /** Supabase project URL, e.g. `https://your-project.supabase.co`. */
  url: string;

  /** Supabase anonymous (public) API key for this project. */
  anonKey: string;
}
