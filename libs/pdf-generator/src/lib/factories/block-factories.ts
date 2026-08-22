import { PdfTemplateValidationError } from '../errors/pdf-template-validation-error';
import type {
  PdfBlock,
  PdfColumnBlock,
  PdfLayoutOptions,
  PdfPageBreakBlock,
  PdfRowBlock,
  PdfSpacerBlock,
  PdfTextBlock,
  PdfTextOptions,
} from '../models/pdf-block';

/**
 * Default `fontSize`/`bold` styling `pdfHeading()` applies for each
 * heading level, before any field explicitly set in its own `opts`
 * overrides that level's default. A fixed table is a deliberate v1
 * simplification, a heading theme configurable per consumer is a
 * candidate for v1.1+, not something this table is meant to grow into.
 */
const HEADING_DEFAULTS: Record<1 | 2 | 3, PdfTextOptions> = {
  1: { fontSize: 20, bold: true },
  2: { fontSize: 16, bold: true },
  3: { fontSize: 13, bold: true },
};

/**
 * Builds a plain text block.
 *
 * @example
 * pdfText('Hello {{cliente.nombre}}', { bold: true });
 */
export function pdfText(content: string, opts?: PdfTextOptions): PdfTextBlock {
  return { type: 'text', content, options: opts };
}

/**
 * Builds a heading block. Its default styling comes from a fixed
 * level-to-style table (`HEADING_DEFAULTS`, `fontSize`/`bold` only); any
 * field also set in `opts` overrides just that field for the chosen
 * level, the rest of that level's defaults are preserved. This table is
 * a fixed v1 simplification, a heading theme configurable per consumer
 * is a candidate for v1.1+.
 *
 * @param level Heading level, from largest to smallest.
 * @default level 1
 * @example
 * pdfHeading('Invoice', 2, { color: '#333333' });
 */
export function pdfHeading(
  content: string,
  level: 1 | 2 | 3 = 1,
  opts?: PdfTextOptions,
): PdfTextBlock {
  return { type: 'text', content, options: { ...HEADING_DEFAULTS[level], ...opts } };
}

/**
 * Builds a column block, stacking `children` vertically. `children` and
 * `opts` (including any fixed `width`) are passed through as given,
 * this factory does no layout distribution of its own, that's decided
 * later by the template compiler.
 *
 * @example
 * pdfColumn([pdfText('Line 1'), pdfText('Line 2')], { gap: 8 });
 */
export function pdfColumn(children: PdfBlock[], opts?: PdfLayoutOptions): PdfColumnBlock {
  return { type: 'column', children, options: opts };
}

/**
 * Builds a row block, placing `children` side by side. `children` and
 * `opts` (including any fixed `width`) are passed through as given,
 * this factory does no layout distribution of its own, that's decided
 * later by the template compiler.
 *
 * @example
 * pdfRow([pdfText('Left'), pdfText('Right')], { gap: 8 });
 */
export function pdfRow(children: PdfBlock[], opts?: PdfLayoutOptions): PdfRowBlock {
  return { type: 'row', children, options: opts };
}

/**
 * Builds a fixed vertical whitespace block.
 *
 * @throws {PdfTemplateValidationError} If `height` is zero or negative;
 * a non-positive spacer is never silently clamped to `0`.
 * @example
 * pdfSpacer(12);
 */
export function pdfSpacer(height: number): PdfSpacerBlock {
  if (height <= 0) {
    throw new PdfTemplateValidationError(
      `pdfSpacer() requires a positive height, received ${height}.`,
    );
  }

  return { type: 'spacer', height };
}

/**
 * Builds a forced page break block.
 *
 * @example
 * pdfPageBreak();
 */
export function pdfPageBreak(): PdfPageBreakBlock {
  return { type: 'pageBreak' };
}
