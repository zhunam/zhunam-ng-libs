import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ColumnConfig, DataColumnConfig } from '../models/column-config';
import { columnId, isDataColumn as isDataColumnConfig } from '../internal/column-id';
import { DataGridSortState } from '../models/sort-state';
import { DATA_GRID_MESSAGES } from '../tokens/data-grid-messages.token';

type SortDirection = 'asc' | 'desc';

// Selectors that opt a click out of rowClick: anything a user would
// reasonably expect to do its own thing on click, inside a
// DisplayColumnConfig's cellTemplate (or, in principle, any cell).
const INTERACTIVE_SELECTOR = 'button, a[href], input, select, textarea, label, [role="button"]';

@Component({
  selector: 'lib-data-grid',
  imports: [NgTemplateOutlet],
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
})
export class DataGrid<T> {
  /**
   * Data to render in the table.
   * @default []
   */
  data = input<T[]>([]);

  /**
   * Configuration of the columns to render, in display order.
   * @example
   * columns: ColumnConfig<User>[] = [
   *   { key: 'name', label: 'Name', sortable: true },
   *   { key: 'email', label: 'Email' },
   * ];
   */
  columns = input.required<ColumnConfig<T>[]>();

  /**
   * Number of rows rendered per page. Unidirectional in both `mode`s: the
   * grid never writes it back, an app that lets the user change it passes
   * a new value in like any other input.
   * @default 10
   */
  pageSize = input(10);

  /**
   * Whether `DataGrid` sorts/paginates `data()` itself (`'client'`) or
   * only renders whatever page the app already sorted/paginated
   * (`'server'`), reporting `currentPage`/`sortState` back so the app
   * knows what to fetch next. Fixed for the component's lifetime:
   * changing it at runtime isn't a supported case (behavior is
   * undefined, not handled specially).
   * @default 'client'
   * @example
   * <lib-data-grid
   *   mode="server"
   *   [data]="page()"
   *   [totalCount]="totalCount()"
   *   [(currentPage)]="currentPage"
   *   [(sortState)]="sortState"
   * />
   */
  mode = input<'client' | 'server'>('client');

  /**
   * Total number of rows across every page, not just the current one.
   * Required in practice for `mode="server"` (there's no other way to
   * derive `totalPages()`); ignored in `mode="client"`, which keeps
   * deriving its total from `data().length` as before. Logs a console
   * error in `mode="server"` when left unset, see `checkServerModeConfig()`.
   */
  totalCount = input<number>();

  /**
   * Emitted when the user clicks a row.
   * @example
   * <lib-data-grid (rowClick)="onRowClick($event)" />
   */
  rowClick = output<T>();

  protected readonly messages = inject(DATA_GRID_MESSAGES);

  /**
   * Current page, 1-based so it maps directly to the "Página X de Y"
   * label without an off-by-one translation. Two-way bindable in both
   * `mode`s: in `mode="client"` this is unchanged from the plain internal
   * signal it used to be if nothing reads or sets it from outside; in
   * `mode="server"` an app binds `[(currentPage)]` to know which page to
   * fetch next.
   * @default 1
   * @example
   * <lib-data-grid mode="server" [(currentPage)]="currentPage" ... />
   */
  readonly currentPage = model(1);

  /**
   * Current sort state. Two-way bindable in both `mode`s, same reasoning
   * as `currentPage`: only meaningful to read or write from outside in
   * `mode="server"`, where the app is the one that actually orders
   * `data()` before passing it back in. In `mode="client"` `DataGrid`
   * still decides sorting itself via `sortBy()`; this model reflects that
   * decision without an app needing to act on it.
   * @default null
   * @example
   * <lib-data-grid mode="server" [(sortState)]="sortState" ... />
   */
  readonly sortState = model<DataGridSortState<T>>(null);

  private readonly sortedData = computed(() => {
    const state = this.sortState();
    const rows = this.data();
    if (!state) {
      return rows;
    }

    const { key, direction } = state;
    const factor = direction === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      // `key` is a column id (string), not `keyof T`: sortBy() only ever
      // sets it from a sortable DataColumnConfig, whose id is its own
      // `keyof T` stringified, so this cast reverses that safely.
      const typedKey = key as keyof T;
      const valueA = a[typedKey];
      const valueB = b[typedKey];
      if (valueA === valueB) {
        return 0;
      }
      // Sortable columns are expected to hold comparable primitives
      // (string, number, Date); `keyof T` alone isn't narrow enough for `<`.
      return ((valueA as string | number) < (valueB as string | number) ? -1 : 1) * factor;
    });
  });

  /**
   * Total number of pages. In `mode="client"`, derived from
   * `sortedData().length` and `pageSize()`, unchanged from before. In
   * `mode="server"`, derived from `totalCount()` and `pageSize()`
   * instead, since the grid never sees the full dataset. Always at least
   * 1, so the page counter never shows a page 0 of 0.
   */
  protected readonly totalPages = computed(() => {
    const total = this.mode() === 'server' ? (this.totalCount() ?? 0) : this.sortedData().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  /**
   * Rows actually rendered for the current page. In `mode="client"`,
   * `sortedData()` sliced to the current page, unchanged from before. In
   * `mode="server"`, `data()` as received, with no slicing or sorting:
   * the app already sent exactly the rows for `currentPage()`.
   */
  protected readonly paginatedData = computed(() => {
    if (this.mode() === 'server') {
      return this.data();
    }
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedData().slice(start, start + this.pageSize());
  });

  constructor() {
    // Sorting, a new `data()`, or a different `pageSize()` can all shrink
    // `totalPages()` below the page the user was on, fall back to page 1
    // instead of rendering an empty page. `totalPages()` already derives
    // from the right source for the active `mode()`, so this needs no
    // mode-specific branching of its own.
    effect(() => {
      if (this.currentPage() > this.totalPages()) {
        this.currentPage.set(1);
      }
    });

    effect(() => this.checkServerModeConfig());
  }

  /**
   * Warns, without throwing, when `mode="server"` is set without
   * `totalCount`: `totalPages()` would silently fall back to 1 instead of
   * the real total, and pagination would look broken with no error to
   * explain why. A `console.error` rather than a thrown error so one
   * missed input on a real app doesn't take down the entire grid's
   * render, just the pagination correctness.
   */
  private checkServerModeConfig(): void {
    if (this.mode() === 'server' && this.totalCount() === undefined) {
      console.error(
        '[DataGrid] mode="server" requires totalCount to be set; totalPages() falls back to 1 without it.',
      );
    }
  }

  /**
   * Stable identity for a column, used as the `track` expression for
   * every `@for` over `columns()`. Exposed to the template only, not
   * part of this component's public API.
   */
  protected columnId(column: ColumnConfig<T>): string {
    return columnId(column);
  }

  /**
   * Narrows a `ColumnConfig<T>` to `DataColumnConfig<T>`. Exposed to the
   * template only, not part of this component's public API.
   */
  protected isDataColumn(column: ColumnConfig<T>): column is DataColumnConfig<T> {
    return isDataColumnConfig(column);
  }

  protected sortBy(column: ColumnConfig<T>): void {
    if (!this.isDataColumn(column) || !column.sortable) {
      return;
    }

    const key = columnId(column);
    this.sortState.update((state) =>
      state?.key === key
        ? { key, direction: state.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  }

  protected sortDirectionFor(column: ColumnConfig<T>): SortDirection | null {
    if (!this.isDataColumn(column)) {
      return null;
    }
    const state = this.sortState();
    return state?.key === columnId(column) ? state.direction : null;
  }

  protected ariaSortFor(column: ColumnConfig<T>): 'ascending' | 'descending' | 'none' {
    const direction = this.sortDirectionFor(column);
    if (direction === 'asc') {
      return 'ascending';
    }
    if (direction === 'desc') {
      return 'descending';
    }
    return 'none';
  }

  protected onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  /**
   * Handles a click anywhere on a row. Suppressed when the click lands on
   * (or inside) an interactive element within the row, e.g. a button or
   * link inside a `DisplayColumnConfig`'s `cellTemplate`, so that
   * element's own click handler is the only thing that runs.
   */
  protected onRowClickEvent(event: MouseEvent, row: T): void {
    const target = event.target as HTMLElement;
    const currentTarget = event.currentTarget as HTMLElement;
    const interactive = target.closest(INTERACTIVE_SELECTOR);
    if (interactive && interactive !== currentTarget && currentTarget.contains(interactive)) {
      return;
    }
    this.onRowClick(row);
  }

  /**
   * Handles Enter/Space on a row. Bound to a plain `(keydown)` rather
   * than Angular's `.enter`/`.space` key-filtered syntax, whose `$event`
   * type-checks as `Event`, not `KeyboardEvent`, filtering here instead.
   * Only emits when the row itself is the key event's target, i.e. the
   * row itself has focus, not an interactive element inside one of its
   * cells: that element's own keyboard handling (native or otherwise) is
   * left alone. Space is `preventDefault()`-ed only in that same case, to
   * stop the page from scrolling without swallowing Space for a focused
   * control inside the row.
   */
  protected onRowKeydown(event: KeyboardEvent, row: T): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
    }
    this.onRowClick(row);
  }

  protected previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }
}
