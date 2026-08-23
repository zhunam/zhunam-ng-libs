import { PdfTemplateSecurityError } from '../errors/pdf-template-security-error';
import { resolvePath, resolveTemplateString } from './resolve-path';

describe('resolvePath', () => {
  it('resolves a simple nested path', () => {
    const data = { cliente: { nombre: 'Ada' } };

    expect(resolvePath('cliente.nombre', data)).toBe('Ada');
  });

  it('resolves to undefined when a segment is missing', () => {
    const data = { cliente: { nombre: 'Ada' } };

    expect(resolvePath('cliente.apellido', data)).toBeUndefined();
  });

  it('resolves to undefined when an intermediate value is not an object', () => {
    const data = { cliente: 'Ada' };

    expect(resolvePath('cliente.nombre', data)).toBeUndefined();
  });

  it('treats a path like "1 + 1" as a literal key name, not an expression', () => {
    expect(resolvePath('1 + 1', {})).toBeUndefined();
  });

  it('throws PdfTemplateSecurityError for a bare "__proto__" segment', () => {
    expect(() => resolvePath('__proto__', {})).toThrow(PdfTemplateSecurityError);
  });

  it('throws PdfTemplateSecurityError for "__proto__.algo" and leaves Object.prototype clean', () => {
    expect(() => resolvePath('__proto__.algo', {})).toThrow(PdfTemplateSecurityError);
    expect(({} as Record<string, unknown>)['algo']).toBeUndefined();
  });

  it('throws PdfTemplateSecurityError for "constructor.prototype.algo" and leaves Object.prototype clean', () => {
    expect(() => resolvePath('constructor.prototype.algo', {})).toThrow(PdfTemplateSecurityError);
    expect(({} as Record<string, unknown>)['algo']).toBeUndefined();
  });
});

describe('resolveTemplateString', () => {
  it('resolves a single placeholder inside free text', () => {
    const data = { cliente: { nombre: 'Ada' } };

    expect(resolveTemplateString('Hola {{cliente.nombre}}!', data)).toBe('Hola Ada!');
  });

  it('resolves multiple placeholders within the same string', () => {
    const data = { cliente: { nombre: 'Ada' }, total: 100 };

    expect(resolveTemplateString('{{cliente.nombre}} debe {{total}}', data)).toBe('Ada debe 100');
  });

  it('resolves a placeholder with no matching value to an empty string', () => {
    expect(resolveTemplateString('Hola {{cliente.nombre}}!', {})).toBe('Hola !');
  });

  it('inserts a resolved value literally, without a second resolution pass', () => {
    const data = { injected: '{{cliente.nombre}}', cliente: { nombre: 'Ada' } };

    expect(resolveTemplateString('{{injected}}', data)).toBe('{{cliente.nombre}}');
  });

  it('throws PdfTemplateSecurityError for an unsafe path inside a placeholder', () => {
    expect(() => resolveTemplateString('{{__proto__.algo}}', {})).toThrow(PdfTemplateSecurityError);
  });
});
