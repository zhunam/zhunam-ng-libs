import { ColumnConfig, DataColumnConfig } from '../models/column-config';

// Internal only, not part of the public API (not exported from
// src/index.ts). A DataColumnConfig always has a real `key`; a
// DisplayColumnConfig's `key` is typed `never` and no real instance of
// one sets it, so presence of `key` reliably tells the two apart without
// a separate discriminant field.
export function isDataColumn<T>(column: ColumnConfig<T>): column is DataColumnConfig<T> {
  return 'key' in column;
}

/**
 * Stable identity for a column: `String(column.key)` for a
 * `DataColumnConfig`, `column.id` for a `DisplayColumnConfig`. Used for
 * every `@for` `track` over columns instead of the column object itself,
 * so Angular keeps matching the same row of DOM (and doesn't lose focus
 * or animation state) across a `columns()` change that leaves the same
 * columns in place.
 *
 * Every column's id/key must be unique among all columns passed to
 * `DataGrid`; not enforced at runtime.
 */
export function columnId<T>(column: ColumnConfig<T>): string {
  return isDataColumn(column) ? String(column.key) : column.id;
}
