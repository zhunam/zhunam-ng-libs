import { TemplateRef } from '@angular/core';

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

  /**
   * Custom template for this column's cells, instead of the default plain
   * text interpolation of `row[key]`. Receives the row as its implicit
   * context (`let-row`).
   * @example
   * <ng-template #imageCell let-row>
   *   <img [src]="row.image" [alt]="row.name" />
   * </ng-template>
   * columns: ColumnConfig<Coin>[] = [
   *   { key: 'image', label: '', cellTemplate: this.imageCell },
   * ];
   */
  cellTemplate?: TemplateRef<{ $implicit: T }>;

  /**
   * Optional CSS class(es) applied to this column's `<td>` for a given row,
   * for conditional per-row styling (e.g. coloring a value positive/negative).
   * Runs alongside `cellTemplate` if both are set.
   * @example
   * cellClass: (row) => row.change > 0 ? 'is-positive' : 'is-negative'
   */
  cellClass?: (row: T) => string;
}
