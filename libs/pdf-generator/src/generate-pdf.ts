import { compileTemplate } from './lib/internal/compile-template';
import { loadPdfEngine } from './lib/internal/load-pdf-engine';
import type { PdfGenerateOptions } from './lib/models/pdf-generate-options';
import type { PdfResult } from './lib/models/pdf-result';
import type { PdfTemplate } from './lib/models/pdf-block';

/**
 * Compiles `template` against `data` and renders it into a real PDF
 * document, loading pdfmake's engine on first use.
 *
 * @param options Remote-image host allowlist and other generation-time
 * settings, separate from the template itself. Not yet enforced by this
 * function, `PdfImageBlock` compilation (where `allowedRemoteHosts`
 * actually gets checked) is a separate task.
 * @example
 * const result = await generatePdf(template, { cliente: { nombre: 'Ada' } });
 * result.download('invoice.pdf');
 */
export async function generatePdf<T>(
  template: PdfTemplate,
  data: T,
  // `options` is part of the public signature ahead of the task that
  // enforces `allowedRemoteHosts` during PdfImageBlock compilation; kept
  // unused here rather than added later as a breaking signature change.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: PdfGenerateOptions = {},
): Promise<PdfResult> {
  const engine = await loadPdfEngine();
  const docDefinition = compileTemplate(template, data);
  const createdPdf = engine.createPdf(docDefinition);

  return {
    download: (filename) => {
      void createdPdf.download(filename);
    },
    open: () => {
      void createdPdf.open();
    },
    getBlob: () => createdPdf.getBlob(),
    toBase64: () => createdPdf.getBase64(),
  };
}
