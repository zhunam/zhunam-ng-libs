import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
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
   */
  columns = input.required<ColumnConfig<T>[]>();

  private readonly sortState = signal<SortState<T> | null>(null);

  /**
   * `data()` sorted by the active column, or in its original order when
   * nothing is sorted yet. Never mutates the array received via `data`.
   */
  protected readonly sortedData = computed(() => {
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

  protected sortBy(column: ColumnConfig<T>): void {
    if (!column.sortable) {
      return;
    }

    // TEMP DEBUG (task 5 sorting bug) — remove once the click/state mismatch is diagnosed.
    console.log('[DataGrid] sortBy before:', this.sortState());
    this.sortState.update((state) =>
      state?.key === column.key
        ? { key: column.key, direction: state.direction === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, direction: 'asc' },
    );
    console.log('[DataGrid] sortBy after:', this.sortState());
  }

  protected sortDirectionFor(column: ColumnConfig<T>): SortDirection | null {
    const state = this.sortState();
    return state?.key === column.key ? state.direction : null;
  }
}
