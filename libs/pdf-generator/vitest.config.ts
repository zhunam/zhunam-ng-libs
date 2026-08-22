import { defineConfig } from 'vitest/config';

// Angular's Vitest builder defaults `test.isolate` to `false`. This library
// will mock the external `pdfmake` SDK across several future spec files
// (the compiler and generatePdf() tasks in ROADMAP.md), each with its own
// `vi.mock()`/`vi.hoisted()` setup. libs/auth hit a real CI failure on
// 2026-08-16 from this exact shared-module-registry issue: only one spec
// file's mock factory per module id actually took effect, corrupting
// unrelated specs. Isolation is enabled here from the first spec, before
// any pdfmake mock exists, so that failure mode never gets a chance to
// reproduce (see libs/pdf-generator/CLAUDE.md).
export default defineConfig({
  test: {
    isolate: true,
  },
});
