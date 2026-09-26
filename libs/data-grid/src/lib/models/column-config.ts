import { TemplateRef } from '@angular/core';

/**
 * A column bound to a real property of `T`: reads and, when `sortable`,
 * sorts by `row[key]`. Use `DisplayColumnConfig` instead for a column
 * that isn't backed by any single field (e.g. an actions column).
 */
export interface DataColumnConfig<T> {
  /**
   * Property of `T` this column reads its cell values from. Also this
   * column's identity: must be unique among every column passed to
   * `DataGrid`, not enforced at runtime.
   */
  key: keyof T;

  /**
   * Text displayed in the column header.
   */
  label: string;

  /**
   * Visually hides `label` while keeping it available to assistive
   * technology (a standard `sr-only` pattern), instead of removing it.
   * Use this for a column whose purpose is already clear from its cell
   * content alone (e.g. an avatar column), never to skip writing a real
   * label.
   * @default false
   */
  labelHidden?: boolean;

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
   * columns: DataColumnConfig<Coin>[] = [
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

/**
 * A column not backed by any single property of `T`, for content that
 * doesn't come from one field (e.g. a row of action buttons). Never
 * sortable, and never reads a value off the row for its own display, its
 * `cellTemplate` is entirely responsible for what renders.
 *
 * The one caveat this library doesn't solve for you: a `rowClick` bound
 * on `<lib-data-grid>` still fires on a click that lands on plain text
 * inside a `DisplayColumnConfig` cell, same as any other cell. It's only
 * suppressed for a click that lands on an actual interactive element
 * (`button`, `a[href]`, `input`, `select`, `textarea`, `label`,
 * `[role="button"]`) inside the cell, see the README's "Display columns"
 * section.
 */
export interface DisplayColumnConfig<T> {
  /**
   * This column's identity: must be unique among every column passed to
   * `DataGrid`, including every `DataColumnConfig.key` (compared as a
   * string). Not enforced at runtime.
   */
  id: string;

  /** A `DisplayColumnConfig` is never bound to a property of `T`. */
  key?: never;

  /**
   * Text displayed in the column header.
   */
  label: string;

  /**
   * Visually hides `label` while keeping it available to assistive
   * technology (a standard `sr-only` pattern), instead of removing it.
   * Use this for a column whose purpose is already clear from its cell
   * content alone (e.g. an actions column labelled just for screen
   * readers), never to skip writing a real label.
   * @default false
   */
  labelHidden?: boolean;

  /** A `DisplayColumnConfig` is never sortable: there's no field to sort by. */
  sortable?: never;

  /**
   * Template rendering this column's cells. Required, unlike
   * `DataColumnConfig.cellTemplate`: a display column has no plain-text
   * fallback to render instead.
   * @example
   * <ng-template #actionsCell let-row>
   *   <button type="button" (click)="edit(row)">Edit</button>
   * </ng-template>
   * columns: ColumnConfig<User>[] = [
   *   { id: 'actions', label: 'Actions', labelHidden: true, cellTemplate: this.actionsCell },
   * ];
   */
  cellTemplate: TemplateRef<{ $implicit: T }>;

  /**
   * Optional CSS class(es) applied to this column's `<td>` for a given row.
   * @example
   * cellClass: (row) => row.isPending ? 'is-pending' : ''
   */
  cellClass?: (row: T) => string;
}

/**
 * Configuration for a single column rendered by `DataGrid`: either a
 * `DataColumnConfig` (bound to a property of `T`) or a
 * `DisplayColumnConfig` (not bound to any single property, e.g. an
 * actions column). Narrow with `'key' in column` where needed; a
 * `DisplayColumnConfig` never has a real `key`.
 */
export type ColumnConfig<T> = DataColumnConfig<T> | DisplayColumnConfig<T>;
