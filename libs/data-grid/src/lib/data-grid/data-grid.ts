import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ColumnConfig, DataColumnConfig } from '../models/column-config';
import { columnId, isDataColumn as isDataColumnConfig } from '../internal/column-id';
import { DATA_GRID_MESSAGES } from '../tokens/data-grid-messages.token';

type SortDirection = 'asc' | 'desc';

interface SortState<T> {
  key: keyof T;
  direction: SortDirection;
}

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
   * Number of rows rendered per page.
   * @default 10
   */
  pageSize = input(10);

  /**
   * Emitted when the user clicks a row.
   * @example
   * <lib-data-grid (rowClick)="onRowClick($event)" />
   */
  rowClick = output<T>();

  protected readonly messages = inject(DATA_GRID_MESSAGES);

  private readonly sortState = signal<SortState<T> | null>(null);

  // 1-based so it maps directly to the "Página X de Y" label without an off-by-one translation.
  protected readonly currentPage = signal(1);

  private readonly sortedData = computed(() => {
    const state = this.sortState();
    const rows = this.data();
    if (!state) {
      return rows;
    }

    const { key, direction } = state;
    const factor = direction === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      const valueA = a[key];
      const valueB = b[key];
      if (valueA === valueB) {
        return 0;
      }
      // Sortable columns are expected to hold comparable primitives
      // (string, number, Date); `keyof T` alone isn't narrow enough for `<`.
      return ((valueA as string | number) < (valueB as string | number) ? -1 : 1) * factor;
    });
  });

  /**
   * Total number of pages for the current `sortedData()` length and `pageSize()`.
   * Always at least 1, so the page counter never shows a page 0 of 0.
   */
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.sortedData().length / this.pageSize())),
  );

  /**
   * `sortedData()` sliced to the current page. Reads from `sortedData()`
   * rather than `data()` so sorting is always applied before paginating.
   */
  protected readonly paginatedData = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedData().slice(start, start + this.pageSize());
  });

  constructor() {
    // Sorting, a new `data()`, or a different `pageSize()` can all shrink
    // `totalPages()` below the page the user was on, fall back to page 1
    // instead of rendering an empty page.
    effect(() => {
      if (this.currentPage() > this.totalPages()) {
        this.currentPage.set(1);
      }
    });
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

    const key = column.key;
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
    return state?.key === column.key ? state.direction : null;
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
