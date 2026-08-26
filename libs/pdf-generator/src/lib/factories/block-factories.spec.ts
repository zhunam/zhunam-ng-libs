import { PdfTemplateValidationError } from '../errors/pdf-template-validation-error';
import {
  pdfColumn,
  pdfHeading,
  pdfImage,
  pdfPageBreak,
  pdfRow,
  pdfSpacer,
  pdfText,
} from './block-factories';

describe('pdfText', () => {
  it('builds a text block with the given content and no options', () => {
    expect(pdfText('Hello')).toEqual({ type: 'text', content: 'Hello', options: undefined });
  });

  it('builds a text block passing the given options through unchanged', () => {
    const options = { bold: true, color: '#333333' };

    expect(pdfText('Hello', options)).toEqual({ type: 'text', content: 'Hello', options });
  });
});

describe('pdfHeading', () => {
  it('defaults to level 1 when omitted', () => {
    expect(pdfHeading('Title')).toEqual({
      type: 'text',
      content: 'Title',
      options: { fontSize: 20, bold: true },
    });
  });

  it('resolves level 1 to its table default', () => {
    expect(pdfHeading('Title', 1)).toEqual({
      type: 'text',
      content: 'Title',
      options: { fontSize: 20, bold: true },
    });
  });

  it('resolves level 2 to its table default', () => {
    expect(pdfHeading('Title', 2)).toEqual({
      type: 'text',
      content: 'Title',
      options: { fontSize: 16, bold: true },
    });
  });

  it('resolves level 3 to its table default', () => {
    expect(pdfHeading('Title', 3)).toEqual({
      type: 'text',
      content: 'Title',
      options: { fontSize: 13, bold: true },
    });
  });

  it('lets an explicit opts field override just that field, preserving the rest of the level default', () => {
    expect(pdfHeading('Title', 2, { fontSize: 99 })).toEqual({
      type: 'text',
      content: 'Title',
      options: { fontSize: 99, bold: true },
    });
  });

  it('merges an unrelated opts field alongside the level default', () => {
    expect(pdfHeading('Title', 1, { color: '#333333' })).toEqual({
      type: 'text',
      content: 'Title',
      options: { fontSize: 20, bold: true, color: '#333333' },
    });
  });
});

describe('pdfColumn', () => {
  it('passes children and opts through unchanged, including width', () => {
    const children = [pdfText('a'), pdfText('b')];
    const opts = { width: 200, gap: 8 };

    expect(pdfColumn(children, opts)).toEqual({ type: 'column', children, options: opts });
  });
});

describe('pdfRow', () => {
  it('passes children and opts through unchanged, including width', () => {
    const children = [pdfText('a'), pdfText('b')];
    const opts = { width: 200, gap: 8 };

    expect(pdfRow(children, opts)).toEqual({ type: 'row', children, options: opts });
  });
});

describe('pdfImage', () => {
  it('builds an image block with the given srcPath and no options', () => {
    expect(pdfImage('photo')).toEqual({ type: 'image', srcPath: 'photo', width: undefined });
  });

  it('builds an image block with the given width', () => {
    expect(pdfImage('photo', { width: 200 })).toEqual({
      type: 'image',
      srcPath: 'photo',
      width: 200,
    });
  });

  it('throws PdfTemplateValidationError for a width of 0', () => {
    expect(() => pdfImage('photo', { width: 0 })).toThrow(PdfTemplateValidationError);
  });

  it('throws PdfTemplateValidationError for a negative width', () => {
    expect(() => pdfImage('photo', { width: -50 })).toThrow(PdfTemplateValidationError);
  });
});

describe('pdfSpacer', () => {
  it('builds a spacer block for a positive height', () => {
    expect(pdfSpacer(10)).toEqual({ type: 'spacer', height: 10 });
  });

  it('throws PdfTemplateValidationError for a height of 0', () => {
    expect(() => pdfSpacer(0)).toThrow(PdfTemplateValidationError);
  });

  it('throws PdfTemplateValidationError for a negative height', () => {
    expect(() => pdfSpacer(-5)).toThrow(PdfTemplateValidationError);
  });
});

describe('pdfPageBreak', () => {
  it('builds a page break block', () => {
    expect(pdfPageBreak()).toEqual({ type: 'pageBreak' });
  });
});
