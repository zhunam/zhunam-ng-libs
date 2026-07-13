/**
 * Configuration for a single column rendered by `DataGrid`.
 */
export interface ColumnConfig<T> {
  /**
   * Property of `T` this column reads its cell values from.
   */
  key: keyof T;

  /**
   * Text displayed in the column header.
   */
  label: string;

  /**
   * Whether clicking the header sorts the grid by this column.
   * @default false
   */
  sortable?: boolean;
}
