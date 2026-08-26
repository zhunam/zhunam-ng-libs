import { compileTemplate } from './lib/internal/compile-template';
import { loadPdfEngine } from './lib/internal/load-pdf-engine';
import type { PdfGenerateOptions } from './lib/models/pdf-generate-options';
import type { PdfResult } from './lib/models/pdf-result';
import type { PdfTemplate } from './lib/models/pdf-block';

/**
 * Reads `blob` into a base64 string, without the `data:...;base64,`
 * prefix. Uses `FileReader`, not `Blob.prototype.arrayBuffer()` +
 * manual encoding: confirmed jsdom (this workspace's test environment)
 * doesn't implement `arrayBuffer()` on `Blob` at all, `FileReader`
 * works there. Real browsers support both; this is the one that's
 * actually verified to work everywhere this library needs to run.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read the generated PDF as base64.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compiles `template` against `data` and renders it into a real PDF
 * document, loading pdfmake's engine on first use.
 *
 * Renders exactly once, eagerly, before returning: pdfmake's `TCreatedPdf`
 * only actually renders (and, for a `header`/`footer`, only actually
 * calls those dynamic-content callbacks) the first time something asks
 * for output, not when it's created. Forcing that here means a rendering
 * error, including one from a malicious header/footer, rejects
 * `generatePdf()` itself, the same as every other error case in this
 * library, rather than surfacing later and only from whichever
 * `PdfResult` method happens to be called first. The resulting `Blob` is
 * then reused directly by every `PdfResult` method: `getBlob()` and
 * `toBase64()` return it (or derive from it) without asking pdfmake for
 * anything again, and `download()`/`open()` still delegate to pdfmake's
 * own methods rather than a hand-rolled `<a>`/`window.open()`
 * implementation, confirmed empirically that pdfmake's `TCreatedPdf`
 * already caches its render on the same instance (a second `getBuffer()`
 * call returned the literal same buffer object, and `download()` called
 * after `getBuffer()` didn't invoke the header/footer callback again),
 * so they reuse this same render for free, they don't need a buffer
 * passed in to avoid re-rendering.
 *
 * @param options Remote-image host allowlist and other generation-time
 * settings, separate from the template itself. `allowedRemoteHosts`
 * defaults to `[]`, denying every remote image; a `data:` URI is always
 * allowed regardless.
 * @example
 * const result = await generatePdf(template, { cliente: { nombre: 'Ada' } });
 * result.download('invoice.pdf');
 */
export async function generatePdf<T>(
  template: PdfTemplate,
  data: T,
  options: PdfGenerateOptions = {},
): Promise<PdfResult> {
  const engine = await loadPdfEngine();
  const docDefinition = compileTemplate(template, data, options.allowedRemoteHosts ?? []);
  const createdPdf = engine.createPdf(docDefinition);

  const blob = await createdPdf.getBlob();
  const base64Promise = blobToBase64(blob);

  return {
    download: (filename) => {
      void createdPdf.download(filename);
    },
    open: () => {
      void createdPdf.open();
    },
    getBlob: () => Promise.resolve(blob),
    toBase64: () => base64Promise,
  };
}
