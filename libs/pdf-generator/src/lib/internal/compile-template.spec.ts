import { pdfImage, pdfPageBreak, pdfSpacer, pdfTable, pdfText } from '../factories/block-factories';
import { PdfTemplateSecurityError } from '../errors/pdf-template-security-error';
import type { PdfTemplate } from '../models/pdf-block';
import { compileTemplate } from './compile-template';

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0=';

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

describe('compileTemplate image blocks', () => {
  it('inlines a data URI directly, without adding it to docDefinition.images', () => {
    const template: PdfTemplate = { body: [pdfImage(PNG_1X1, { width: 50 })] };

    const doc = compileTemplate(template, {});

    expect(doc.content).toEqual([{ image: PNG_1X1, width: 50 }]);
    expect(doc.images).toEqual({});
  });

  it('replaces an allowed remote URL with a named key, and registers it under docDefinition.images', () => {
    const url = 'https://cdn.example.com/photo.png';
    const template: PdfTemplate = { body: [pdfImage(url, { width: 80 })] };

    const doc = compileTemplate(template, {}, ['cdn.example.com']);

    expect(doc.content).toEqual([{ image: 'img_0', width: 80 }]);
    expect(doc.images).toEqual({ img_0: url });
  });

  it('assigns a unique, incrementing key to each remote image in the same template', () => {
    const template: PdfTemplate = {
      body: [
        pdfImage('https://cdn.example.com/a.png'),
        pdfImage('https://cdn.example.com/b.png'),
      ],
    };

    const doc = compileTemplate(template, {}, ['cdn.example.com']);

    expect(doc.content).toEqual([
      { image: 'img_0', width: undefined },
      { image: 'img_1', width: undefined },
    ]);
    expect(doc.images).toEqual({
      img_0: 'https://cdn.example.com/a.png',
      img_1: 'https://cdn.example.com/b.png',
    });
  });

  it('assigns distinct keys to two remote images from two different allowed hosts, neither overwriting the other', () => {
    const template: PdfTemplate = {
      body: [
        pdfImage('https://cdn-a.example.com/photo.png'),
        pdfImage('https://cdn-b.example.com/photo.png'),
      ],
    };

    const doc = compileTemplate(template, {}, ['cdn-a.example.com', 'cdn-b.example.com']);

    expect(doc.content).toEqual([
      { image: 'img_0', width: undefined },
      { image: 'img_1', width: undefined },
    ]);
    expect(doc.images).toEqual({
      img_0: 'https://cdn-a.example.com/photo.png',
      img_1: 'https://cdn-b.example.com/photo.png',
    });
  });

  it('throws PdfTemplateSecurityError for a remote image host not in allowedRemoteHosts', () => {
    const template: PdfTemplate = { body: [pdfImage('https://cdn.example.com/photo.png')] };

    expect(() => compileTemplate(template, {}, [])).toThrow(PdfTemplateSecurityError);
  });

  it('registers a footer-only remote image into the same docDefinition.images object once the footer runs', () => {
    const url = 'https://cdn.example.com/logo.png';
    const template: PdfTemplate = { body: [], footer: pdfImage(url, { width: 30 }) };

    const doc = compileTemplate(template, {}, ['cdn.example.com']);
    const footer = doc.footer as unknown as (
      currentPage: number,
      pageCount: number,
    ) => Record<string, unknown>;

    expect(doc.images).toEqual({});

    const compiled = footer(1, 1);

    expect(compiled).toEqual({ image: 'img_0', width: 30 });
    expect(doc.images).toEqual({ img_0: url });
  });
});
