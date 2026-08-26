import { generatePdf } from './generate-pdf';
import { pdfImage, pdfText } from './lib/factories/block-factories';
import { PdfTemplateSecurityError } from './lib/errors/pdf-template-security-error';
import { PdfTemplateValidationError } from './lib/errors/pdf-template-validation-error';
import type { PdfTemplate } from './lib/models/pdf-block';

const PNG_1X1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const PNG_1X1_DATA_URI = `data:image/png;base64,${PNG_1X1_BASE64}`;

describe('generatePdf', () => {
  it('produces a PdfResult whose getBlob() resolves to a non-empty application/pdf Blob', async () => {
    const template: PdfTemplate = { body: [pdfText('Hello {{name}}')] };

    const result = await generatePdf(template, { name: 'Ada' });
    const blob = await result.getBlob();

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('rejects with PdfTemplateValidationError when an image srcPath resolves to neither a data URI nor a URL', async () => {
    const template: PdfTemplate = { body: [pdfImage('photo')] };

    await expect(generatePdf(template, {})).rejects.toThrow(PdfTemplateValidationError);
  });

  it('generates a real PDF for a data URI image with allowedRemoteHosts left empty', async () => {
    const template: PdfTemplate = { body: [pdfImage(PNG_1X1_DATA_URI, { width: 20 })] };

    const result = await generatePdf(template, {});
    const blob = await result.getBlob();

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('rejects with PdfTemplateSecurityError, producing no PdfResult at all, for a disallowed remote image host', async () => {
    const template: PdfTemplate = {
      body: [pdfImage('https://cdn.example.com/photo.png')],
    };

    await expect(generatePdf(template, {})).rejects.toThrow(PdfTemplateSecurityError);
  });

  it('generates a real, non-empty PDF for a remote image whose host is in options.allowedRemoteHosts', async () => {
    // Mocks the network layer (global fetch), not pdfmake itself: this
    // still exercises pdfmake's real image-fetching code path end to
    // end (confirmed in manual testing that it calls `fetch()` when an
    // image is referenced through `TDocumentDefinitions.images`), it
    // just doesn't depend on any specific external URL staying
    // reachable, which would make this test flaky in CI over time.
    const pngBytes = Uint8Array.from(atob(PNG_1X1_BASE64), (char) => char.charCodeAt(0));
    // mockImplementation, not mockResolvedValue: a Response body can
    // only be read once, mockResolvedValue would reuse the same
    // instance (and therefore the same already-consumed body) across
    // every call, this needs a fresh Response per fetch() invocation.
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response(pngBytes, { headers: { 'content-type': 'image/png' } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const template: PdfTemplate = {
        body: [pdfImage('https://cdn.example.com/photo.png', { width: 20 })],
      };

      const result = await generatePdf(template, {}, { allowedRemoteHosts: ['cdn.example.com'] });
      const blob = await result.getBlob();

      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('produces two independently correct PdfResults across two separate, consecutive calls with different remote images', async () => {
    // Two separate calls, not one template with two images: this is
    // specifically checking for state leaking between calls (e.g. a
    // module-level or otherwise shared images dictionary), which a
    // single call with two images inside it would never expose.
    const pngBytes = Uint8Array.from(atob(PNG_1X1_BASE64), (char) => char.charCodeAt(0));
    // mockImplementation, not mockResolvedValue: a Response body can
    // only be read once, mockResolvedValue would reuse the same
    // instance (and therefore the same already-consumed body) across
    // every call, this needs a fresh Response per fetch() invocation.
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response(pngBytes, { headers: { 'content-type': 'image/png' } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const templateA: PdfTemplate = {
        body: [pdfImage('https://cdn-a.example.com/photo.png', { width: 20 })],
      };
      const templateB: PdfTemplate = {
        body: [pdfImage('https://cdn-b.example.com/photo.png', { width: 20 })],
      };

      const resultA = await generatePdf(templateA, {}, { allowedRemoteHosts: ['cdn-a.example.com'] });
      const resultB = await generatePdf(templateB, {}, { allowedRemoteHosts: ['cdn-b.example.com'] });

      const blobA = await resultA.getBlob();
      const blobB = await resultB.getBlob();

      expect(blobA.type).toBe('application/pdf');
      expect(blobA.size).toBeGreaterThan(0);
      expect(blobB.type).toBe('application/pdf');
      expect(blobB.size).toBeGreaterThan(0);

      const fetchedUrls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(fetchedUrls).toContain('https://cdn-a.example.com/photo.png');
      expect(fetchedUrls).toContain('https://cdn-b.example.com/photo.png');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
