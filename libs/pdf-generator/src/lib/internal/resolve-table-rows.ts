import { PdfTemplateValidationError } from '../errors/pdf-template-validation-error';
import type { PdfTableBlock } from '../models/pdf-block';
import { resolvePath } from './resolve-path';

/**
 * Coerces a resolved table cell value into display text. `null` and
 * `undefined` become an empty string, so a missing value never renders
 * as the literal text "null" or "undefined", anything else is coerced
 * with `String()`.
 */
export function toCellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * A `PdfTableBlock` resolved against a data object: literal column
 * headers, plus each row's cell text, in column order.
 */
export interface ResolvedTableRows {
  headers: string[];
  rows: string[][];
}

/**
 * Resolves a `PdfTableBlock` against `data`: reads the row array from
 * `block.rowsPath` (via `resolvePath()`, so the same
 * `__proto__`/`constructor`/`prototype` denylist already applies, it
 * isn't reimplemented here), then reads each column's `path` from
 * every row object in turn, relative to that row, not to `data` as a
 * whole.
 *
 * @returns `headers`, taken literally from `block.columns` in order (a
 * template constant, never resolved against `data`), and `rows`, one
 * string array per source row, in the same column order. An empty
 * source array resolves to `rows: []`, that's not an error.
 * @throws {PdfTemplateValidationError} If the value found at
 * `block.rowsPath` is not an array.
 * @throws {PdfTemplateSecurityError} If `block.rowsPath` or any
 * column's `path` contains a `__proto__`/`constructor`/`prototype`
 * segment, via `resolvePath()`.
 */
export function resolveTableRows(block: PdfTableBlock, data: unknown): ResolvedTableRows {
  const headers = block.columns.map((column) => column.header);
  const sourceRows = resolvePath(block.rowsPath, data);

  if (!Array.isArray(sourceRows)) {
    const foundType = sourceRows === null ? 'null' : typeof sourceRows;
    throw new PdfTemplateValidationError(
      `Expected an array at "${block.rowsPath}" for a table's rows, found ${foundType} instead.`,
    );
  }

  const rows = sourceRows.map((row) =>
    block.columns.map((column) => toCellText(resolvePath(column.path, row))),
  );

  return { headers, rows };
}
