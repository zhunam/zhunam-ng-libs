import { generatePdf } from './generate-pdf';
import { pdfImage, pdfTable, pdfText } from './lib/factories/block-factories';
import { PdfTemplateSecurityError } from './lib/errors/pdf-template-security-error';
import { PdfTemplateValidationError } from './lib/errors/pdf-template-validation-error';
import type { PdfTemplate } from './lib/models/pdf-block';

// End-to-end security tests against the real generatePdf(), built
// entirely from the public factory API, the way a hostile third-party
// template actually would be, not against resolvePath()/
// resolveImageSource()/etc. in isolation. Those already have their own
// unit coverage (resolve-path.spec.ts, resolve-image-source.spec.ts,
// resolve-table-rows.spec.ts); this file exists to confirm the
// guarantees still hold once everything is wired together through the
// one function a consumer actually calls.

const PNG_1X1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function expectPrototypeClean(key: string): void {
  expect((Object.prototype as Record<string, unknown>)[key]).toBeUndefined();
  // A brand new object literal, created after the attempt: if the
  // attempt had actually polluted Object.prototype, this would inherit
  // the polluted key. Throwing alone isn't proof nothing mutated.
  expect(({} as Record<string, unknown>)[key]).toBeUndefined();
}

describe('generatePdf() security: prototype pollution, per public API entry point', () => {
  it('rejects a malicious placeholder in a body pdfText content', async () => {
    const template: PdfTemplate = { body: [pdfText('{{__proto__.polluted}}')] };

    await expect(generatePdf(template, {})).rejects.toBeInstanceOf(PdfTemplateSecurityError);
    expectPrototypeClean('polluted');
  });

  it('rejects a malicious PdfTableColumn.path', async () => {
    const template: PdfTemplate = {
      body: [pdfTable('items', { columns: [{ header: 'X', path: '__proto__.polluted' }] })],
    };

    await expect(generatePdf(template, { items: [{}] })).rejects.toBeInstanceOf(
      PdfTemplateSecurityError,
    );
    expectPrototypeClean('polluted');
  });

  it('rejects a malicious PdfTableBlock.rowsPath', async () => {
    const template: PdfTemplate = {
      body: [pdfTable('__proto__.polluted', { columns: [{ header: 'X', path: 'x' }] })],
    };

    await expect(generatePdf(template, {})).rejects.toBeInstanceOf(PdfTemplateSecurityError);
    expectPrototypeClean('polluted');
  });

  it('rejects a malicious PdfImageBlock.srcPath', async () => {
    const template: PdfTemplate = { body: [pdfImage('{{__proto__.polluted}}')] };

    await expect(generatePdf(template, {})).rejects.toBeInstanceOf(PdfTemplateSecurityError);
    expectPrototypeClean('polluted');
  });

  it('rejects a malicious placeholder inside a footer, not just the body', async () => {
    // generatePdf() forces one full render before returning (see
    // generate-pdf.ts), so a header/footer's dynamic-content callback,
    // which pdfmake would otherwise only call on the first render-
    // triggering method, gets exercised right here too. Same pattern as
    // every other case in this file: generatePdf() itself rejects, no
    // PdfResult is ever produced.
    const template: PdfTemplate = {
      body: [pdfText('safe body text')],
      footer: pdfText('{{__proto__.polluted}}'),
    };

    await expect(generatePdf(template, {})).rejects.toBeInstanceOf(PdfTemplateSecurityError);
    expectPrototypeClean('polluted');
  });

  it('kitchen sink: a template combining several attack vectors rejects on the first one found, none of them pollute anything', async () => {
    const template: PdfTemplate = {
      body: [
        pdfText('{{__proto__.polluted}}'),
        pdfTable('__proto__.alsoPolluted', { columns: [{ header: 'X', path: 'x' }] }),
        pdfImage('{{constructor.prototype.polluted}}'),
      ],
    };

    await expect(generatePdf(template, {})).rejects.toBeInstanceOf(PdfTemplateSecurityError);
    expectPrototypeClean('polluted');
    expectPrototypeClean('alsoPolluted');
  });
});

describe('generatePdf() security: no expression engine', () => {
  it('treats "1 + 1" and "require(\'fs\')" as literal (non-existent) key names, not expressions: resolves to empty text, no security error', async () => {
    const template: PdfTemplate = {
      body: [pdfText("Math: {{1 + 1}} FS: {{require('fs')}}")],
    };

    const result = await generatePdf(template, {});
    const blob = await result.getBlob();

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('generatePdf() security: data is not a template attack', () => {
  it('inserts a consumer data value that happens to look like "{{__proto__.algo}}" as plain text, no re-resolution, no security error', async () => {
    // This is about DATA, not the TEMPLATE: the template itself only has
    // one legitimate, safe placeholder. The client's own name just
    // happens to be a string that looks like a placeholder, maybe
    // innocently, maybe not, either way resolveTemplateString() only
    // ever does a single pass, so this is inserted as inert text, the
    // exact behavior already unit-tested in resolve-path.spec.ts,
    // confirmed here end to end through the public API.
    const template: PdfTemplate = { body: [pdfText('Cliente: {{cliente.nombre}}')] };
    const data = { cliente: { nombre: '{{__proto__.algo}}' } };

    const result = await generatePdf(template, data);
    const blob = await result.getBlob();

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('generatePdf() security: remote images denied by default, end to end', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a remote image with no options at all, before ever touching the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const template: PdfTemplate = { body: [pdfImage('https://cdn.example.com/photo.png')] };

    await expect(generatePdf(template, {})).rejects.toBeInstanceOf(PdfTemplateSecurityError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a remote image with allowedRemoteHosts explicitly empty, before ever touching the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const template: PdfTemplate = { body: [pdfImage('https://cdn.example.com/photo.png')] };

    await expect(
      generatePdf(template, {}, { allowedRemoteHosts: [] }),
    ).rejects.toBeInstanceOf(PdfTemplateSecurityError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('positive control: the same remote image succeeds once its host is allowed, the gate is not over-blocking', async () => {
    const pngBytes = Uint8Array.from(atob(PNG_1X1_BASE64), (char) => char.charCodeAt(0));
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response(pngBytes, { headers: { 'content-type': 'image/png' } }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const template: PdfTemplate = {
      body: [pdfImage('https://cdn.example.com/photo.png', { width: 20 })],
    };

    const result = await generatePdf(template, {}, { allowedRemoteHosts: ['cdn.example.com'] });
    const blob = await result.getBlob();

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe('generatePdf() security: error type distinction survives end to end', () => {
  it('rejects malformed data (rowsPath resolving to a non-array) with PdfTemplateValidationError, not PdfTemplateSecurityError', async () => {
    const template: PdfTemplate = {
      body: [pdfTable('items', { columns: [{ header: 'X', path: 'x' }] })],
    };
    const data = { items: 'not an array' };

    await expect(generatePdf(template, data)).rejects.toBeInstanceOf(PdfTemplateValidationError);
    await expect(generatePdf(template, data)).rejects.not.toBeInstanceOf(
      PdfTemplateSecurityError,
    );
  });
});

describe('generatePdf() security: rendering happens exactly once per successful generation', () => {
  // Direct evidence, through the public API only, that a successful
  // PdfResult is backed by a single cached render, not something that
  // re-renders (and, for a malicious header/footer, could re-run its
  // callback) on every call. That pdfmake's own TCreatedPdf also
  // happens to cache internally (confirmed empirically against the raw
  // engine, see the comment in generate-pdf.ts) isn't something this
  // suite can observe from outside, this test instead confirms this
  // library's own wrapper: getBlob() always returns the one Blob
  // captured when generatePdf() forced the render, never a new one.
  it('getBlob() called twice on the same PdfResult returns the exact same Blob, not a freshly rendered one', async () => {
    const template: PdfTemplate = { body: [pdfText('Hello {{name}}')] };
    const result = await generatePdf(template, { name: 'Ada' });

    const blobA = await result.getBlob();
    const blobB = await result.getBlob();

    expect(blobA).toBe(blobB);
  });

  it('toBase64() called twice on the same PdfResult returns the same string, derived from that one cached Blob', async () => {
    const template: PdfTemplate = { body: [pdfText('Hello {{name}}')] };
    const result = await generatePdf(template, { name: 'Ada' });

    const base64A = await result.toBase64();
    const base64B = await result.toBase64();

    expect(base64A).toBe(base64B);
    expect(base64A.length).toBeGreaterThan(0);
  });
});
