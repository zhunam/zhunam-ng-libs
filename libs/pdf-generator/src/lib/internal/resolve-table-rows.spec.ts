import { PdfTemplateSecurityError } from '../errors/pdf-template-security-error';
import { PdfTemplateValidationError } from '../errors/pdf-template-validation-error';
import type { PdfTableBlock } from '../models/pdf-block';
import { resolveTableRows, toCellText } from './resolve-table-rows';

describe('toCellText', () => {
  it('resolves null to an empty string', () => {
    expect(toCellText(null)).toBe('');
  });

  it('resolves undefined to an empty string', () => {
    expect(toCellText(undefined)).toBe('');
  });

  it('coerces other values with String()', () => {
    expect(toCellText(42)).toBe('42');
    expect(toCellText(true)).toBe('true');
    expect(toCellText('hello')).toBe('hello');
  });
});

describe('resolveTableRows', () => {
  const block: PdfTableBlock = {
    type: 'table',
    rowsPath: 'items',
    columns: [
      { header: 'Product', path: 'name' },
      { header: 'Qty', path: 'quantity' },
    ],
  };

  it('extracts headers literally, in column order, without resolving them', () => {
    const { headers } = resolveTableRows(block, { items: [] });

    expect(headers).toEqual(['Product', 'Qty']);
  });

  it('resolves normal rows into an array of string arrays, in column order', () => {
    const data = {
      items: [
        { name: 'Widget', quantity: 3 },
        { name: 'Gadget', quantity: 1 },
      ],
    };

    const { rows } = resolveTableRows(block, data);

    expect(rows).toEqual([
      ['Widget', '3'],
      ['Gadget', '1'],
    ]);
  });

  it('resolves a missing cell value to an empty string without breaking the rest of the row', () => {
    const data = { items: [{ name: 'Widget' }] };

    const { rows } = resolveTableRows(block, data);

    expect(rows).toEqual([['Widget', '']]);
  });

  it('throws PdfTemplateValidationError when rowsPath resolves to a string', () => {
    expect(() => resolveTableRows(block, { items: 'not an array' })).toThrow(
      PdfTemplateValidationError,
    );
  });

  it('throws PdfTemplateValidationError when rowsPath resolves to a number', () => {
    expect(() => resolveTableRows(block, { items: 42 })).toThrow(PdfTemplateValidationError);
  });

  it('throws PdfTemplateValidationError when rowsPath resolves to a plain object', () => {
    expect(() => resolveTableRows(block, { items: { not: 'an array' } })).toThrow(
      PdfTemplateValidationError,
    );
  });

  it('throws PdfTemplateValidationError when rowsPath resolves to undefined', () => {
    expect(() => resolveTableRows(block, {})).toThrow(PdfTemplateValidationError);
  });

  it('resolves an empty source array to rows: [] without throwing', () => {
    const { headers, rows } = resolveTableRows(block, { items: [] });

    expect(headers).toEqual(['Product', 'Qty']);
    expect(rows).toEqual([]);
  });

  it('inherits the prototype-pollution protection from resolvePath for a malicious column path', () => {
    const maliciousBlock: PdfTableBlock = {
      type: 'table',
      rowsPath: 'items',
      columns: [{ header: 'Bad', path: '__proto__.algo' }],
    };

    expect(() => resolveTableRows(maliciousBlock, { items: [{}] })).toThrow(
      PdfTemplateSecurityError,
    );
  });
});
