import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { ColumnConfig } from '../models/column-config';

type SortDirection = 'asc' | 'desc';

interface SortState<T> {
  key: keyof T;
  direction: SortDirection;
}

@Component({
  selector: 'lib-data-grid',
  imports: [],
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    // `totalPages()` below the page the user was on — fall back to page 1
    // instead of rendering an empty page.
    effect(() => {
      if (this.currentPage() > this.totalPages()) {
        this.currentPage.set(1);
      }
    });
  }

  protected sortBy(column: ColumnConfig<T>): void {
    if (!column.sortable) {
      return;
    }

    this.sortState.update((state) =>
      state?.key === column.key
        ? { key: column.key, direction: state.direction === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, direction: 'asc' },
    );
  }

  protected sortDirectionFor(column: ColumnConfig<T>): SortDirection | null {
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

  protected previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }
}
