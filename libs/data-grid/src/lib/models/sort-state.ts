/**
 * Current sort applied to `DataGrid`, or `null` when no column is sorted.
 * `key` is the column's own string identity (`columnId()` internally:
 * `String(column.key)` for a `DataColumnConfig`, `column.id` for a
 * `DisplayColumnConfig`), not `keyof T`: a `DisplayColumnConfig` has no
 * `keyof T` to point at, and this type has to describe both.
 *
 * Meaningful to read or write from outside the component only in
 * `mode="server"`, where the app owns the actual sort. In `mode="client"`
 * (the default) `DataGrid` still decides sorting itself; this model still
 * reflects that internal decision, but an app has no reason to set it.
 */
// `T` isn't referenced in the shape below (`key` is a column id string,
// not `keyof T`), kept anyway so this type stays generic like every other
// public type in this library (`ColumnConfig<T>`, `DataGrid<T>`), in case
// a future addition here ever needs to key off `T` without a breaking change.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type DataGridSortState<T> =
  | {
      key: string;
      direction: 'asc' | 'desc';
    }
  | null;
