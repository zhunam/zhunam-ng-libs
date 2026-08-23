import { generatePdf } from './generate-pdf';
import { pdfImage, pdfText } from './lib/factories/block-factories';
import { PdfTemplateValidationError } from './lib/errors/pdf-template-validation-error';
import type { PdfTemplate } from './lib/models/pdf-block';

describe('generatePdf', () => {
  it('produces a PdfResult whose getBlob() resolves to a non-empty application/pdf Blob', async () => {
    const template: PdfTemplate = { body: [pdfText('Hello {{name}}')] };

    const result = await generatePdf(template, { name: 'Ada' });
    const blob = await result.getBlob();

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('rejects with PdfTemplateValidationError when the body contains an image block', async () => {
    const template: PdfTemplate = { body: [pdfImage('photo')] };

    await expect(generatePdf(template, {})).rejects.toThrow(PdfTemplateValidationError);
  });
});
