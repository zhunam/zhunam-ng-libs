import { defineConfig } from 'vitest/config';

// Angular's Vitest builder defaults `test.isolate` to `false`. pdfmake
// itself is never mocked in this library, most specs run real
// integration tests that generate real PDFs; only `fetch` is mocked,
// and only in the two remote-image tests in generate-pdf.spec.ts. This
// still needs isolation for the original reason documented in
// libs/pdf-generator/CLAUDE.md: multiple spec files touching the same
// external resource without isolation between files caused a real
// module-registry race condition in Vitest, confirmed in libs/auth's CI
// failure on 2026-08-16 (only one spec file's mock factory per module
// id actually took effect, corrupting unrelated specs). Isolation is
// enabled here from the first spec, proactively, not because this
// library hit the same failure.
export default defineConfig({
  test: {
    isolate: true,
  },
});
