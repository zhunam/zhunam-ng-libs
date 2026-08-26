import type { PdfMakeEngine } from './pdfmake-types';

let enginePromise: Promise<PdfMakeEngine> | undefined;

/**
 * Dynamically imports pdfmake's browser engine and its default font's
 * virtual file system (`vfs`, Roboto), and returns the engine ready to
 * use.
 *
 * Always lazy, never a top-level `import`: pdfmake's engine and its
 * bundled Roboto font data are large, and most consumers of a component
 * library never call `generatePdf()` on every page load, so paying for
 * that weight eagerly would be wasted bundle size for everyone who
 * doesn't (this trade-off is already documented in
 * `libs/pdf-generator/ROADMAP.md`, under "Decisiones de arquitectura").
 *
 * Without loading the vfs first, pdfmake cannot compute text width, wrap
 * lines, or lay out a page for the `Roboto` font this library's
 * `compileTemplate()` requests by name in `defaultStyle`: confirmed by
 * actually generating a PDF both ways, `createPdf({ defaultStyle: {
 * font: 'Roboto' } })` throws `File 'Roboto-Regular.ttf' not found in
 * virtual file system` when the vfs hasn't been loaded yet, and succeeds
 * once it has (pdfmake does have built-in standard fonts like Helvetica
 * that work without any vfs at all, but this library never asks for
 * those, so that fallback is never exercised here).
 *
 * Memoized: only the first call actually performs the dynamic imports;
 * every call, concurrent or not, shares the same promise, so the engine
 * is loaded exactly once no matter how many times `generatePdf()` runs.
 */
export function loadPdfEngine(): Promise<PdfMakeEngine> {
  enginePromise ??= (async () => {
    const [pdfMakeModule, vfsModule] = await Promise.all([
      import('pdfmake/build/pdfmake.js'),
      import('pdfmake/build/vfs_fonts.js'),
    ]);

    // pdfmake's own type declarations describe this module as though it
    // were a true ES module exporting `createPdf`/`addVirtualFileSystem`/
    // etc. as top-level named exports. At runtime it's actually a webpack
    // UMD bundle (`pdfmake/build/pdfmake.js`); a real dynamic `import()`
    // of it wraps that bundle's CommonJS `module.exports` under
    // `.default` instead. Confirmed empirically: `pdfMakeModule.createPdf`
    // is `undefined`, `(pdfMakeModule as { default: PdfMakeEngine
    // }).default.createPdf` is the real function. This cast corrects a
    // genuine types-vs-runtime mismatch, not a stylistic preference.
    const engine = (pdfMakeModule as unknown as { default: PdfMakeEngine }).default;
    const vfs = (vfsModule as unknown as { default: import('./pdfmake-types').TVirtualFileSystem })
      .default;

    // Actually redundant: importing vfs_fonts.js registers the vfs as a
    // side effect of the module evaluating (confirmed empirically, a PDF
    // requesting `font: 'Roboto'` succeeds even when this call is skipped
    // as long as the module above was imported). Kept anyway: it's the
    // documented public API for this, not an internal side effect this
    // library should rely on staying stable across pdfmake versions.
    engine.addVirtualFileSystem(vfs);

    // `pdfMake.setUrlAccessPolicy()` is intentionally never called here.
    // Confirmed empirically: pdfmake's browser bundle already fetches a
    // remote image URL referenced via `TDocumentDefinitions.images` by
    // default, with no policy configured at all (tested with a URL that
    // returns non-image content, `Unknown image format` proves the fetch
    // happened; a policy blocking it would have failed before ever
    // reaching that point). This library's own security boundary is
    // `resolveImageSource()`'s `allowedRemoteHosts` check, called once
    // per image before pdfmake ever sees the URL, not this policy hook.
    // Configuring a permissive policy here would be redundant at best,
    // and misleading at worst, it would look like a security control
    // when the actual one lives entirely in `resolveImageSource()`.

    return engine;
  })();

  return enginePromise;
}
