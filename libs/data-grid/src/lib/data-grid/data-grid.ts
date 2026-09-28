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
   * Row predicate applied before sorting/pagination, in `mode="client"`
   * only: a row is rendered when this returns `true` for it, or every
   * row is rendered when left `undefined`. Has no effect at all in
   * `mode="server"`, where the app is expected to filter before ever
   * passing `data()` in, same as it's expected to sort/paginate there.
   *
   * Not debounced internally: every new function reference re-runs the
   * filter over the whole dataset, so an app deriving this from live
   * text input (e.g. a search box) should debounce that signal itself
   * before it reaches `filterFn`, the same way it would before making a
   * real request in `mode="server"`.
   * @default undefined
   * @example
   * searchTerm = signal('');
   * filterFn = computed(() => {
   *   const term = this.searchTerm().toLowerCase();
   *   return term ? (row: User) => row.name.toLowerCase().includes(term) : undefined;
   * });
   */
  filterFn = input<((row: T) => boolean) | undefined>(undefined);

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
   * Whether `DataGrid` renders its own row-selection checkbox column: a
   * "select all" checkbox in the header, one checkbox per row in the
   * body. Requires `rowKey` to also be set, logs a `console.error` and
   * renders without the column otherwise, see `checkSelectionConfig()`.
   * @default false
   * @example
   * <lib-data-grid [selectable]="true" [rowKey]="rowKey" [(selection)]="selection" ... />
   */
  selectable = input<boolean>(false);

  /**
   * Extracts a stable, unique identifier from a row, used as the key in
   * `selection()`. Required in practice when `selectable` is `true`:
   * there's no other way to track which rows are selected across a sort,
   * a filter, or a page change, since row objects themselves aren't
   * guaranteed stable identity (e.g. a fresh array from a server fetch).
   * @default undefined
   * @example
   * rowKey = (user: User) => user.id;
   */
  rowKey = input<((row: T) => string | number) | undefined>(undefined);

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

  /**
   * Keys (from `rowKey()`) of every currently selected row, across every
   * page, not just the one visible now: a key that isn't in the rows
   * currently loaded is simply not reflected in the "select all" checkbox
   * state, it isn't purged from this set. Two-way bindable, same pattern
   * as `currentPage`/`sortState`: an app reads this to act on a bulk
   * selection (this library never acts on it itself), and can also set
   * it directly, e.g. to clear the selection after a bulk action.
   * @default new Set()
   * @example
   * <lib-data-grid [selectable]="true" [rowKey]="rowKey" [(selection)]="selection" ... />
   */
  readonly selection = model<Set<string | number>>(new Set());

  /**
   * `data()` narrowed by `filterFn()`, or `data()` itself when
   * `filterFn()` is `undefined`. Only ever read by `sortedData()`, never
   * by `paginatedData()` directly in `mode="server"`, that's what keeps
   * `filterFn` inert there.
   */
  private readonly filteredData = computed(() => {
    const predicate = this.filterFn();
    const rows = this.data();
    return predicate ? rows.filter(predicate) : rows;
  });

  private readonly sortedData = computed(() => {
    const state = this.sortState();
    const rows = this.filteredData();
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
   * `sortedData().length` and `pageSize()` (`sortedData()` already
   * reflects `filterFn()`, so a filter narrows this too). In
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
   * `sortedData()` sliced to the current page (already filtered and
   * sorted). In `mode="server"`, `data()` as received directly, never
   * `filteredData()`/`sortedData()`, with no filtering, slicing, or
   * sorting: the app already sent exactly the rows for `currentPage()`,
   * and `filterFn` has no effect in this mode.
   */
  protected readonly paginatedData = computed(() => {
    if (this.mode() === 'server') {
      return this.data();
    }
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedData().slice(start, start + this.pageSize());
  });

  /**
   * Whether the selection checkbox column actually renders: `selectable()`
   * alone isn't enough, `rowKey()` also has to be set, there's no other
   * way to key `selection()`. Exposed to the template only.
   */
  protected readonly showSelectionColumn = computed(
    () => this.selectable() && this.rowKey() !== undefined,
  );

  /**
   * Selection state of the current page as a whole, for the header
   * "select all" checkbox: `'all'` checks it, `'none'` unchecks it,
   * `'some'` renders it indeterminate. Always `'none'` when there's no
   * `rowKey()` or the current page is empty.
   */
  protected readonly pageSelectionState = computed<'all' | 'none' | 'some'>(() => {
    const getKey = this.rowKey();
    const rows = this.paginatedData();
    if (!getKey || rows.length === 0) {
      return 'none';
    }

    const selected = this.selection();
    const selectedCount = rows.filter((row) => selected.has(getKey(row))).length;
    if (selectedCount === 0) {
      return 'none';
    }
    return selectedCount === rows.length ? 'all' : 'some';
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
    effect(() => this.checkSelectionConfig());
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
   * Warns, without throwing, when `selectable` is `true` without
   * `rowKey`: `showSelectionColumn()` would otherwise silently render no
   * selection column at all, with no error to explain why. Same
   * reasoning as `checkServerModeConfig()`: a `console.error`, not a
   * thrown error, so a missed input doesn't take down the whole render.
   */
  private checkSelectionConfig(): void {
    if (this.selectable() && this.rowKey() === undefined) {
      console.error(
        '[DataGrid] selectable requires rowKey to be set; the selection column will not render without it.',
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

  /**
   * Whether a given row is currently selected. `false` whenever `rowKey`
   * isn't set, the same as the rest of the selection surface.
   */
  protected isRowSelected(row: T): boolean {
    const getKey = this.rowKey();
    return getKey ? this.selection().has(getKey(row)) : false;
  }

  /**
   * Toggles a single row's selection, leaving every other key in
   * `selection()` untouched, including keys from other pages.
   */
  protected toggleRow(row: T): void {
    const getKey = this.rowKey();
    if (!getKey) {
      return;
    }
    const key = getKey(row);
    this.selection.update((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  /**
   * Toggles selection for every row on the current page only: adds all
   * of their keys when the page isn't already fully selected, removes
   * only those keys otherwise. Never touches a key belonging to a row
   * outside `paginatedData()`.
   */
  protected toggleSelectAll(): void {
    const getKey = this.rowKey();
    if (!getKey) {
      return;
    }
    const rows = this.paginatedData();
    const selectAll = this.pageSelectionState() !== 'all';
    this.selection.update((current) => {
      const next = new Set(current);
      for (const row of rows) {
        const key = getKey(row);
        if (selectAll) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return next;
    });
  }
}
