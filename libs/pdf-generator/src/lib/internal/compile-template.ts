import { PdfTemplateValidationError } from '../errors/pdf-template-validation-error';
import type { PdfBlock, PdfTemplate } from '../models/pdf-block';
import { resolveTemplateString } from './resolve-path';
import type { Column, Content, TDocumentDefinitions } from './pdfmake-types';
import { resolveTableRows } from './resolve-table-rows';

/**
 * The page margin, in points, used for any side of `PdfMargins` left
 * unset. Matches pdfmake's own built-in default (`pageMargins: 40`
 * uniformly), so a template that never sets `margins` at all renders
 * identically to one that explicitly sets every side to this value.
 */
const DEFAULT_PAGE_MARGIN = 40;

/**
 * A block's own layout width, read only from `PdfColumnBlock` and
 * `PdfRowBlock` (the only block types with a `PdfLayoutOptions.width`);
 * every other block type has no such concept and resolves to
 * `undefined`. Used when compiling a `PdfRowBlock`'s children: each
 * child's own width, if it set one, becomes that child's column width
 * in pdfmake's `columns` array.
 */
function getBlockWidth(block: PdfBlock): number | undefined {
  return block.type === 'column' || block.type === 'row' ? block.options?.width : undefined;
}

/**
 * Compiles a single `PdfBlock` into pdfmake `Content`, resolving any
 * `{{path}}` placeholder against `data` along the way (via
 * `resolveTemplateString()`/`resolveTableRows()`, reused as-is, their
 * security behavior is not reimplemented here).
 *
 * `PdfLayoutOptions.gap` (on `PdfColumnBlock`/`PdfRowBlock`) is not
 * consumed here yet: pdfmake has no native per-item vertical gap for a
 * `stack`, and applying it manually (e.g. via `marginBottom` on every
 * child but the last) is a real design decision on its own, deferred
 * rather than guessed at in this pass.
 *
 * @throws {PdfTemplateValidationError} If `block` is a `PdfImageBlock`;
 * image compilation is a separate task, not implemented here yet. This
 * is a deliberate, explicit placeholder, not a silent no-op.
 */
function compileBlock(block: PdfBlock, data: unknown): Content {
  switch (block.type) {
    case 'text': {
      const { bold, italic, fontSize, color, alignment } = block.options ?? {};
      return {
        text: resolveTemplateString(block.content, data),
        bold,
        italics: italic,
        fontSize,
        color,
        alignment,
      };
    }

    case 'column':
      return { stack: block.children.map((child) => compileBlock(child, data)) };

    case 'row':
      return {
        // pdfmake's own types model `Column` as `Content & ColumnProperties`,
        // but each `Content` union member also forbids every other member's
        // properties (`ForbidOtherElementProperties`), so a generic,
        // not-yet-narrowed `Content` intersected with `{ width }` doesn't
        // structurally satisfy `Column` even though attaching a width to
        // any content, whichever shape it is, is exactly what pdfmake
        // expects here at runtime. `Column` itself also isn't part of this
        // package's public export surface to import directly. The double
        // cast is a deliberate, narrow escape hatch for that specific type
        // modeling gap, not a workaround for a real bug.
        columns: block.children.map((child) => {
          const compiled = compileBlock(child, data) as unknown as Record<string, unknown>;
          return { ...compiled, width: getBlockWidth(child) } as unknown as Column;
        }),
      };

    case 'table': {
      const { headers, rows } = resolveTableRows(block, data);
      return { table: { body: [headers, ...rows] } };
    }

    case 'spacer':
      return { text: '', marginBottom: block.height };

    case 'pageBreak':
      return { text: '', pageBreak: 'after' };

    case 'image':
      throw new PdfTemplateValidationError('Image blocks are not yet supported by compileTemplate.');
  }
}

/**
 * Compiles a `PdfTemplate`'s `header` or `footer` block into pdfmake's
 * dynamic-content function shape, or returns `undefined` when there's no
 * block to compile.
 *
 * The reserved `pageNumber`/`pageCount` placeholders always win over any
 * same-named key already present in `data`: they're added to the
 * resolution context after spreading `data`, and a later object-literal
 * property always overrides an earlier one with the same key. A
 * template's header/footer can otherwise read any path resolved against
 * `data`, same as the rest of the template.
 */
function compileHeaderFooter(
  block: PdfBlock | undefined,
  data: unknown,
): ((currentPage: number, pageCount: number) => Content) | undefined {
  if (!block) {
    return undefined;
  }

  return (currentPage, pageCount) => {
    const context = { ...(data as Record<string, unknown>), pageNumber: currentPage, pageCount };
    return compileBlock(block, context);
  };
}

/**
 * Compiles a `PdfTemplate` and a data object into a pdfmake
 * `TDocumentDefinitions`, ready to pass to `createPdf()`.
 */
export function compileTemplate(template: PdfTemplate, data: unknown): TDocumentDefinitions {
  const { pageSize = 'A4', margins, header, footer, body } = template;

  return {
    pageSize,
    pageMargins: margins
      ? [
          margins.left ?? DEFAULT_PAGE_MARGIN,
          margins.top ?? DEFAULT_PAGE_MARGIN,
          margins.right ?? DEFAULT_PAGE_MARGIN,
          margins.bottom ?? DEFAULT_PAGE_MARGIN,
        ]
      : undefined,
    header: compileHeaderFooter(header, data),
    footer: compileHeaderFooter(footer, data),
    content: body.map((block) => compileBlock(block, data)),
    defaultStyle: { font: 'Roboto' },
  };
}
