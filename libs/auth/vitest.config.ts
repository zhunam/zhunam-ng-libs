import { defineConfig } from 'vitest/config';

// Angular's Vitest builder defaults `test.isolate` to `false` to emulate the
// Karma/Jasmine experience of running every spec file in one shared global
// context. This library breaks that assumption: firebase-auth.service.spec.ts,
// provide-firebase-auth.spec.ts, and auth-flow.integration.spec.ts each call
// `vi.mock('firebase/auth', ...)` independently (same for '@supabase/supabase-js'
// in provide-supabase-auth.spec.ts and the integration spec), each with its own
// `vi.hoisted()` mock functions. With a shared module registry, only one file's
// mock factory per module id actually takes effect; the others silently observe
// a foreign or stale mock, which is what caused the CI failures on 2026-08-16
// (calls reported as never happening, and one file's rejection value leaking
// into another file's assertion). Re-enabling isolation gives each spec file
// its own module registry again, matching what these mocks assume.
export default defineConfig({
  test: {
    isolate: true,
  },
});
