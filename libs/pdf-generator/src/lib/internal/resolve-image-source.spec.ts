import { PdfTemplateSecurityError } from '../errors/pdf-template-security-error';
import { PdfTemplateValidationError } from '../errors/pdf-template-validation-error';
import { resolveImageSource } from './resolve-image-source';

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0=';

describe('resolveImageSource', () => {
  it('returns a data URI as-is, regardless of allowedRemoteHosts', () => {
    expect(resolveImageSource(PNG_1X1, {}, [])).toBe(PNG_1X1);
  });

  it('returns a remote URL as-is when its host is in allowedRemoteHosts', () => {
    const url = 'https://cdn.example.com/photo.png';

    expect(resolveImageSource(url, {}, ['cdn.example.com'])).toBe(url);
  });

  it('throws PdfTemplateSecurityError with the rejected host when allowedRemoteHosts is the empty default', () => {
    const url = 'https://cdn.example.com/photo.png';

    expect(() => resolveImageSource(url, {})).toThrow(PdfTemplateSecurityError);
    expect(() => resolveImageSource(url, {})).toThrow(/cdn\.example\.com/);
  });

  it('throws PdfTemplateSecurityError with the rejected host when allowedRemoteHosts lists a different host', () => {
    const url = 'https://cdn.example.com/photo.png';

    expect(() => resolveImageSource(url, {}, ['other.example.com'])).toThrow(
      PdfTemplateSecurityError,
    );
  });

  it('throws PdfTemplateValidationError for a relative path', () => {
    expect(() => resolveImageSource('assets/photo.png', {})).toThrow(PdfTemplateValidationError);
  });

  it('throws PdfTemplateValidationError for an empty string', () => {
    expect(() => resolveImageSource('', {})).toThrow(PdfTemplateValidationError);
  });

  it('applies the host check to the resolved value, not the literal placeholder', () => {
    const data = { producto: { imagenUrl: 'https://cdn.example.com/photo.png' } };

    expect(resolveImageSource('{{producto.imagenUrl}}', data, ['cdn.example.com'])).toBe(
      'https://cdn.example.com/photo.png',
    );
    expect(() => resolveImageSource('{{producto.imagenUrl}}', data, [])).toThrow(
      PdfTemplateSecurityError,
    );
  });

  it('inherits PdfTemplateSecurityError from the resolver for an unsafe path segment, without reimplementing the protection', () => {
    // srcPath goes through resolveTemplateString, which only resolves a
    // path wrapped in {{...}}; a bare path with no braces is just
    // literal text (same behavior as pdfText()'s content), so the
    // placeholder syntax is required here to actually exercise
    // resolvePath()'s denylist through this function.
    expect(() => resolveImageSource('{{__proto__.algo}}', {})).toThrow(PdfTemplateSecurityError);
  });
});
