import { pdfPageBreak, pdfSpacer, pdfTable, pdfText } from '../factories/block-factories';
import type { PdfTemplate } from '../models/pdf-block';
import { compileTemplate } from './compile-template';

type DynamicHeaderFooter = (currentPage: number, pageCount: number) => Record<string, unknown>;

describe('compileTemplate', () => {
  it('compiles a simple template (text + table + spacer + pageBreak) into the expected docDefinition shape', () => {
    const template: PdfTemplate = {
      body: [
        pdfText('Hello {{name}}'),
        pdfTable('items', { columns: [{ header: 'Product', path: 'name' }] }),
        pdfSpacer(12),
        pdfPageBreak(),
      ],
    };
    const data = { name: 'Ada', items: [{ name: 'Widget' }] };

    const doc = compileTemplate(template, data);

    expect(doc.pageSize).toBe('A4');
    expect(doc.defaultStyle).toEqual({ font: 'Roboto' });
    expect(doc.content).toEqual([
      {
        text: 'Hello Ada',
        bold: undefined,
        italics: undefined,
        fontSize: undefined,
        color: undefined,
        alignment: undefined,
      },
      { table: { body: [['Product'], ['Widget']] } },
      { text: '', marginBottom: 12 },
      { text: '', pageBreak: 'after' },
    ]);
  });

  it('falls back to a 40pt page margin for any unset PdfMargins side', () => {
    const template: PdfTemplate = { body: [], margins: { top: 10 } };

    const doc = compileTemplate(template, {});

    expect(doc.pageMargins).toEqual([40, 10, 40, 40]);
  });

  it('leaves pageMargins undefined (pdfmake\'s own default) when no margins are given at all', () => {
    const template: PdfTemplate = { body: [] };

    const doc = compileTemplate(template, {});

    expect(doc.pageMargins).toBeUndefined();
  });
});

describe('compileTemplate header/footer', () => {
  it('resolves {{pageNumber}} and a normal data key in the same string', () => {
    const template: PdfTemplate = {
      body: [],
      footer: pdfText('Page {{pageNumber}} for {{cliente.nombre}}'),
    };
    const data = { cliente: { nombre: 'Ada' } };

    const doc = compileTemplate(template, data);
    const footer = doc.footer as unknown as DynamicHeaderFooter;
    const compiled = footer(3, 10);

    expect(compiled['text']).toBe('Page 3 for Ada');
  });

  it('lets the reserved pageNumber always win over a same-named data key', () => {
    const template: PdfTemplate = { body: [], footer: pdfText('Page {{pageNumber}}') };
    const data = { pageNumber: 999 };

    const doc = compileTemplate(template, data);
    const footer = doc.footer as unknown as DynamicHeaderFooter;
    const compiled = footer(3, 10);

    expect(compiled['text']).toBe('Page 3');
  });

  it('returns undefined for an unset header/footer', () => {
    const doc = compileTemplate({ body: [] }, {});

    expect(doc.header).toBeUndefined();
    expect(doc.footer).toBeUndefined();
  });
});
