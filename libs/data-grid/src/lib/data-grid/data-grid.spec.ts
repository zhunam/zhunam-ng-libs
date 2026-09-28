import { Component, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataGrid } from './data-grid';
import { ColumnConfig } from '../models/column-config';
import { DataGridMessages, DATA_GRID_MESSAGES_ES } from '../models/data-grid-messages';
import { DataGridSortState } from '../models/sort-state';
import { provideDataGridMessages } from '../tokens/data-grid-messages.token';

interface TestRow {
  name: string;
  age: number;
}

const columns: ColumnConfig<TestRow>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'age', label: 'Age' },
];

const twoSortableColumns: ColumnConfig<TestRow>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'age', label: 'Age', sortable: true },
];

const unsortedRows: TestRow[] = [
  { name: 'Charlie', age: 30 },
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 40 },
];

function createFixture(
  data: TestRow[],
  options: {
    columns?: ColumnConfig<TestRow>[];
    pageSize?: number;
    mode?: 'client' | 'server';
    totalCount?: number;
    filterFn?: (row: TestRow) => boolean;
    selectable?: boolean;
    rowKey?: (row: TestRow) => string | number;
    loading?: boolean;
  } = {},
): ComponentFixture<DataGrid<TestRow>> {
  const fixture = TestBed.createComponent(DataGrid<TestRow>);
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('columns', options.columns ?? columns);
  if (options.pageSize !== undefined) {
    fixture.componentRef.setInput('pageSize', options.pageSize);
  }
  if (options.mode !== undefined) {
    fixture.componentRef.setInput('mode', options.mode);
  }
  if (options.totalCount !== undefined) {
    fixture.componentRef.setInput('totalCount', options.totalCount);
  }
  if (options.filterFn !== undefined) {
    fixture.componentRef.setInput('filterFn', options.filterFn);
  }
  if (options.selectable !== undefined) {
    fixture.componentRef.setInput('selectable', options.selectable);
  }
  if (options.rowKey !== undefined) {
    fixture.componentRef.setInput('rowKey', options.rowKey);
  }
  if (options.loading !== undefined) {
    fixture.componentRef.setInput('loading', options.loading);
  }
  fixture.detectChanges();
  return fixture;
}

function root(fixture: ComponentFixture<DataGrid<TestRow>>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function getNameColumnValues(fixture: ComponentFixture<DataGrid<TestRow>>): string[] {
  // Scoped to `.dg-row` (real data rows), not just any `tbody tr`: the
  // loading/empty state also renders as a `<tr>` in `<tbody>` (`.dg-state-row`),
  // which would otherwise be misread as a data row with a "name" cell.
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('tbody tr.dg-row td:first-child')).map(
    (cell) => cell.textContent?.trim() ?? '',
  );
}

function getRowCount(fixture: ComponentFixture<DataGrid<TestRow>>): number {
  return root(fixture).querySelectorAll('tbody tr.dg-row').length;
}

function getStateRow(fixture: ComponentFixture<DataGrid<TestRow>>): HTMLElement | null {
  return root(fixture).querySelector('.dg-state-row');
}

function getPageInfo(fixture: ComponentFixture<DataGrid<TestRow>>): string {
  return root(fixture).querySelector('.dg-page-info')?.textContent?.trim() ?? '';
}

function getPageButtons(fixture: ComponentFixture<DataGrid<TestRow>>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.dg-page-btn'));
}

function getHeaderCheckbox(fixture: ComponentFixture<DataGrid<TestRow>>): HTMLInputElement {
  return root(fixture).querySelector('thead input[type="checkbox"]') as HTMLInputElement;
}

function getRowCheckboxes(fixture: ComponentFixture<DataGrid<TestRow>>): HTMLInputElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]'));
}

@Component({
  template: `
    <ng-template #customCell let-row>
      <span class="custom-name">{{ row.name }}</span>
    </ng-template>
    <lib-data-grid [data]="data" [columns]="columns" />
  `,
  imports: [DataGrid],
})
class HostWithCustomCell implements OnInit {
  @ViewChild('customCell', { static: true })
  customCell!: TemplateRef<{ $implicit: TestRow }>;

  data = unsortedRows;
  columns: ColumnConfig<TestRow>[] = [];

  ngOnInit(): void {
    this.columns = [
      {
        key: 'name',
        label: 'Name',
        cellTemplate: this.customCell,
        cellClass: (row) => (row.age >= 30 ? 'is-senior' : 'is-junior'),
      },
      { key: 'age', label: 'Age' },
    ];
  }
}

// The sortable header's click handler now lives on the <button> inside
// the <th>, not the <th> itself (see PASO 3 of the data-grid columns
// block); a non-sortable header has no button, so this falls back to
// clicking the (handler-less) <th> itself, confirming the no-op case.
function clickHeader(fixture: ComponentFixture<DataGrid<TestRow>>, index: number): void {
  const th = root(fixture).querySelectorAll<HTMLElement>('th')[index];
  const button = th.querySelector<HTMLElement>('button');
  (button ?? th).click();
  fixture.detectChanges();
}

// jsdom doesn't synthesize the native `click` a real <button> fires when
// Enter/Space activates it while focused, unlike a real browser
// (confirmed with Playwright separately) - dispatched explicitly here so
// the test still exercises the real consequence of that native behavior.
function activateHeaderButtonViaKeyboard(
  fixture: ComponentFixture<DataGrid<TestRow>>,
  index: number,
  key: string,
): void {
  const button = root(fixture).querySelectorAll<HTMLElement>('th')[index].querySelector<HTMLElement>('button');
  button?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  button?.click();
  fixture.detectChanges();
}

function clickPrevious(fixture: ComponentFixture<DataGrid<TestRow>>): void {
  getPageButtons(fixture)[0].click();
  fixture.detectChanges();
}

function clickNext(fixture: ComponentFixture<DataGrid<TestRow>>): void {
  getPageButtons(fixture)[1].click();
  fixture.detectChanges();
}

describe('DataGrid', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataGrid],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = createFixture(unsortedRows);
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('sorting', () => {
    it('renders rows in the original order before any sort is applied', () => {
      const fixture = createFixture(unsortedRows);
      expect(getNameColumnValues(fixture)).toEqual(['Charlie', 'Alice', 'Bob']);
    });

    it('sorts ascending on the first click of a sortable header', () => {
      const fixture = createFixture(unsortedRows);
      clickHeader(fixture, 0);
      expect(getNameColumnValues(fixture)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('toggles to descending on a second click of the same header', () => {
      const fixture = createFixture(unsortedRows);
      clickHeader(fixture, 0);
      clickHeader(fixture, 0);
      expect(getNameColumnValues(fixture)).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('does nothing when clicking a header marked as not sortable', () => {
      const fixture = createFixture(unsortedRows);
      clickHeader(fixture, 1); // 'Age' column, sortable is not set
      expect(getNameColumnValues(fixture)).toEqual(['Charlie', 'Alice', 'Bob']);
    });

    it('starts a newly clicked column at ascending instead of continuing the previous cycle', () => {
      const fixture = createFixture(unsortedRows, { columns: twoSortableColumns });
      clickHeader(fixture, 0); // name asc
      clickHeader(fixture, 0); // name desc
      clickHeader(fixture, 1); // switch to age, should start at asc, not desc

      // Ascending by age: Alice (25), Charlie (30), Bob (40)
      expect(getNameColumnValues(fixture)).toEqual(['Alice', 'Charlie', 'Bob']);
    });

    it('sorts when a sortable header is activated with Enter', () => {
      const fixture = createFixture(unsortedRows);
      activateHeaderButtonViaKeyboard(fixture, 0, 'Enter');

      expect(getNameColumnValues(fixture)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts when a sortable header is activated with Space', () => {
      const fixture = createFixture(unsortedRows);
      activateHeaderButtonViaKeyboard(fixture, 0, ' ');

      expect(getNameColumnValues(fixture)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('keeps the original relative order of rows that tie on the sorted column', () => {
      const rowsWithTie: TestRow[] = [
        { name: 'Bob', age: 40 },
        { name: 'Bob', age: 20 },
        { name: 'Alice', age: 25 },
      ];
      const fixture = createFixture(rowsWithTie);
      clickHeader(fixture, 0); // sort by name ascending, the two "Bob" rows are equal on this column

      const ages = Array.from(
        root(fixture).querySelectorAll<HTMLElement>('tbody tr td:nth-child(2)'),
      ).map((cell) => cell.textContent?.trim());
      // Alice sorts first; the two equal "Bob" rows must keep their original 40-then-20 order.
      expect(ages).toEqual(['25', '40', '20']);
    });
  });

  describe('pagination', () => {
    const fiveRows: TestRow[] = [
      { name: 'Row1', age: 1 },
      { name: 'Row2', age: 2 },
      { name: 'Row3', age: 3 },
      { name: 'Row4', age: 4 },
      { name: 'Row5', age: 5 },
    ];

    it('renders only pageSize rows per page', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 });
      expect(getRowCount(fixture)).toBe(2);
    });

    it('computes totalPages from data length and pageSize', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 });
      expect(getPageInfo(fixture)).toBe('Page 1 of 3');
    });

    it('does not advance past the last page', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 });
      clickNext(fixture);
      clickNext(fixture);
      clickNext(fixture); // already on the last page
      expect(getPageInfo(fixture)).toBe('Page 3 of 3');
    });

    it('does not go before the first page', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 });
      clickPrevious(fixture); // already on the first page
      expect(getPageInfo(fixture)).toBe('Page 1 of 3');
    });

    it('goes back a page when clicking Previous from a later page', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 });
      clickNext(fixture); // page 2
      clickPrevious(fixture); // back to page 1
      expect(getPageInfo(fixture)).toBe('Page 1 of 3');
    });

    it('disables the previous/next buttons at each boundary', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 });
      const [previousBtn, nextBtn] = getPageButtons(fixture);

      expect(previousBtn.disabled).toBe(true);
      expect(nextBtn.disabled).toBe(false);

      clickNext(fixture);
      clickNext(fixture);

      expect(previousBtn.disabled).toBe(false);
      expect(nextBtn.disabled).toBe(true);
    });

    it('resets to a valid page when the dataset shrinks below the current page', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 });
      clickNext(fixture);
      clickNext(fixture); // page 3 of 3
      expect(getPageInfo(fixture)).toBe('Page 3 of 3');

      fixture.componentRef.setInput('data', fiveRows.slice(0, 2)); // now only 1 page
      fixture.detectChanges();

      expect(getPageInfo(fixture)).toBe('Page 1 of 1');
    });
  });

  describe('sorting + pagination combined', () => {
    it('paginates the already-sorted data, not the original order', () => {
      const fixture = createFixture(unsortedRows, { pageSize: 2 });
      clickHeader(fixture, 0); // sort by name ascending
      clickNext(fixture); // move to page 2

      // Full ascending order is Alice, Bob, Charlie; page 2 (pageSize 2) is just Charlie.
      expect(getNameColumnValues(fixture)).toEqual(['Charlie']);
    });
  });

  describe('client-side filtering (filterFn)', () => {
    const fiveRows: TestRow[] = [
      { name: 'Row1', age: 1 },
      { name: 'Row2', age: 2 },
      { name: 'Row3', age: 3 },
      { name: 'Row4', age: 4 },
      { name: 'Row5', age: 5 },
    ];

    it('renders only the rows matching filterFn, in their original relative order', () => {
      const fixture = createFixture(unsortedRows, { filterFn: (row) => row.age >= 30 });

      // unsortedRows is Charlie(30), Alice(25), Bob(40); Alice is excluded.
      expect(getNameColumnValues(fixture)).toEqual(['Charlie', 'Bob']);
    });

    it('sorts the filtered result, not the full dataset', () => {
      const fixture = createFixture(unsortedRows, { filterFn: (row) => row.age >= 30 });
      clickHeader(fixture, 0); // sort by name ascending

      // If sorting ran over the full dataset first, Alice (excluded by the
      // filter) would still show up. It must not.
      expect(getNameColumnValues(fixture)).toEqual(['Bob', 'Charlie']);
    });

    it('paginates over the filtered result: totalPages() and paginatedData() reflect only the matching rows', () => {
      const fixture = createFixture(fiveRows, {
        pageSize: 2,
        filterFn: (row) => row.age <= 3, // Row1, Row2, Row3 match
      });

      expect(getPageInfo(fixture)).toBe('Page 1 of 2'); // ceil(3 / 2), not ceil(5 / 2)
      expect(getRowCount(fixture)).toBe(2);
    });

    it('resets currentPage to 1 when a stricter filterFn leaves the current page empty', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 }); // 3 pages, no filter yet
      clickNext(fixture);
      clickNext(fixture); // page 3 of 3
      expect(getPageInfo(fixture)).toBe('Page 3 of 3');

      // Only 2 rows match now: 1 page. Page 3 no longer exists.
      fixture.componentRef.setInput('filterFn', (row: TestRow) => row.age <= 2);
      fixture.detectChanges();

      expect(getPageInfo(fixture)).toBe('Page 1 of 1');
      expect(getNameColumnValues(fixture)).toEqual(['Row1', 'Row2']);
    });

    it('has no effect in mode="server": paginatedData() renders data() as received, unfiltered', () => {
      const fixture = createFixture(unsortedRows, {
        mode: 'server',
        totalCount: unsortedRows.length,
        filterFn: (row) => row.age >= 30, // would exclude Alice in client mode
      });

      expect(getNameColumnValues(fixture)).toEqual(['Charlie', 'Alice', 'Bob']);
    });

    it('shows the full dataset again once filterFn goes from defined back to undefined', () => {
      const fixture = createFixture(unsortedRows, { filterFn: (row) => row.age >= 30 });
      expect(getNameColumnValues(fixture)).toEqual(['Charlie', 'Bob']);

      fixture.componentRef.setInput('filterFn', undefined);
      fixture.detectChanges();

      expect(getNameColumnValues(fixture)).toEqual(['Charlie', 'Alice', 'Bob']);
    });
  });

  describe('checkbox row selection (selectable)', () => {
    const rowKey = (row: TestRow) => row.name;

    const fiveRows: TestRow[] = [
      { name: 'Row1', age: 1 },
      { name: 'Row2', age: 2 },
      { name: 'Row3', age: 3 },
      { name: 'Row4', age: 4 },
      { name: 'Row5', age: 5 },
    ];

    it('renders no checkbox at all when selectable is false (the default)', () => {
      const fixture = createFixture(unsortedRows);
      expect(root(fixture).querySelectorAll('input[type="checkbox"]').length).toBe(0);
    });

    describe('selectable without rowKey', () => {
      let errorSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      });

      afterEach(() => {
        errorSpy.mockRestore();
      });

      it('logs a console.error and renders no selection column, treated as selectable=false', () => {
        const fixture = createFixture(unsortedRows, { selectable: true });

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('rowKey'));
        expect(root(fixture).querySelectorAll('input[type="checkbox"]').length).toBe(0);
      });

      it('does not log when selectable is false, even without rowKey', () => {
        createFixture(unsortedRows);
        expect(errorSpy).not.toHaveBeenCalled();
      });
    });

    it('renders a header checkbox and one checkbox per row when selectable and rowKey are both set', () => {
      const fixture = createFixture(unsortedRows, { selectable: true, rowKey });

      expect(getHeaderCheckbox(fixture)).toBeTruthy();
      expect(getRowCheckboxes(fixture).length).toBe(unsortedRows.length);
    });

    it('selecting one row adds only its key to selection(), leaving every other key untouched', () => {
      const fixture = createFixture(unsortedRows, { selectable: true, rowKey });

      getRowCheckboxes(fixture)[0].click(); // Charlie
      fixture.detectChanges();

      expect(fixture.componentInstance.selection()).toEqual(new Set(['Charlie']));
    });

    it('deselecting a row removes only its key, leaving every other selected key untouched', () => {
      const fixture = createFixture(unsortedRows, { selectable: true, rowKey });
      fixture.componentInstance.selection.set(new Set(['Charlie', 'Bob']));
      fixture.detectChanges();

      getRowCheckboxes(fixture)[0].click(); // Charlie, currently checked
      fixture.detectChanges();

      expect(fixture.componentInstance.selection()).toEqual(new Set(['Bob']));
    });

    it('select all adds every key on the current page, without touching a pre-existing key from another page', () => {
      const fixture = createFixture(fiveRows, { selectable: true, rowKey, pageSize: 2 });
      // Pretend Row5 (page 3) was already selected from a previous page.
      fixture.componentInstance.selection.set(new Set(['Row5']));
      fixture.detectChanges();

      getHeaderCheckbox(fixture).click(); // page 1: Row1, Row2
      fixture.detectChanges();

      expect(fixture.componentInstance.selection()).toEqual(new Set(['Row5', 'Row1', 'Row2']));
    });

    it('deselect all removes only the current page keys, without touching a key from another page', () => {
      const fixture = createFixture(fiveRows, { selectable: true, rowKey, pageSize: 2 });
      fixture.componentInstance.selection.set(new Set(['Row1', 'Row2', 'Row5']));
      fixture.detectChanges();
      expect(getHeaderCheckbox(fixture).checked).toBe(true); // page 1 fully selected

      getHeaderCheckbox(fixture).click();
      fixture.detectChanges();

      expect(fixture.componentInstance.selection()).toEqual(new Set(['Row5']));
    });

    it('shows indeterminate (DOM property) and aria-checked="mixed" when only some rows on the page are selected', () => {
      const fixture = createFixture(unsortedRows, { selectable: true, rowKey });
      fixture.componentInstance.selection.set(new Set(['Charlie']));
      fixture.detectChanges();

      const headerCheckbox = getHeaderCheckbox(fixture);
      expect(headerCheckbox.checked).toBe(false);
      expect(headerCheckbox.indeterminate).toBe(true);
      expect(headerCheckbox.getAttribute('aria-checked')).toBe('mixed');
    });

    it('the header checkbox is plainly checked/unchecked, no aria-checked attribute, when the page is fully selected or empty of selection', () => {
      const fixture = createFixture(unsortedRows, { selectable: true, rowKey });
      expect(getHeaderCheckbox(fixture).hasAttribute('aria-checked')).toBe(false);

      fixture.componentInstance.selection.set(new Set(unsortedRows.map(rowKey)));
      fixture.detectChanges();

      const headerCheckbox = getHeaderCheckbox(fixture);
      expect(headerCheckbox.checked).toBe(true);
      expect(headerCheckbox.indeterminate).toBe(false);
      expect(headerCheckbox.hasAttribute('aria-checked')).toBe(false);
    });

    it('reflects a selection() set directly from outside in both the header and row checkboxes', () => {
      const fixture = createFixture(unsortedRows, { selectable: true, rowKey });

      fixture.componentInstance.selection.set(new Set(['Charlie', 'Alice', 'Bob']));
      fixture.detectChanges();

      expect(getHeaderCheckbox(fixture).checked).toBe(true);
      expect(getRowCheckboxes(fixture).every((checkbox) => checkbox.checked)).toBe(true);
    });

    it('clicking a row checkbox does not trigger rowClick', () => {
      const fixture = createFixture(unsortedRows, { selectable: true, rowKey });
      const clicked: TestRow[] = [];
      fixture.componentInstance.rowClick.subscribe((row) => clicked.push(row));

      getRowCheckboxes(fixture)[0].click();
      fixture.detectChanges();

      expect(clicked).toEqual([]);
    });

    it('select all only takes the filtered rows on the current page, not the excluded ones', () => {
      const fixture = createFixture(unsortedRows, {
        selectable: true,
        rowKey,
        filterFn: (row) => row.age >= 30, // Charlie and Bob match, Alice is excluded
      });

      getHeaderCheckbox(fixture).click();
      fixture.detectChanges();

      expect(fixture.componentInstance.selection()).toEqual(new Set(['Charlie', 'Bob']));
    });
  });

  describe('loading and empty states', () => {
    it('shows the default loading message and renders no real rows, regardless of data() size', () => {
      const fixture = createFixture(unsortedRows, { loading: true });

      expect(getRowCount(fixture)).toBe(0);
      expect(getStateRow(fixture)?.textContent?.trim()).toBe('Loading...');
    });

    it('shows the default empty message when loading is false and there are no rows', () => {
      const fixture = createFixture([]);

      expect(getRowCount(fixture)).toBe(0);
      expect(getStateRow(fixture)?.textContent?.trim()).toBe('No data to display');
    });

    it('shows the empty message when filterFn excludes every row, not the loading one', () => {
      const fixture = createFixture(unsortedRows, { filterFn: () => false });

      expect(getStateRow(fixture)?.textContent?.trim()).toBe('No data to display');
    });

    it('loading takes priority over the empty state when data() also happens to be empty', () => {
      const fixture = createFixture([], { loading: true });

      expect(getStateRow(fixture)?.textContent?.trim()).toBe('Loading...');
    });

    describe('colspan', () => {
      it('spans every column while loading, without a selection column', () => {
        const fixture = createFixture(unsortedRows, { loading: true }); // 2 columns
        expect(getStateRow(fixture)?.querySelector('td')?.getAttribute('colspan')).toBe('2');
      });

      it('spans every column plus the selection column while loading, when selectable is on', () => {
        const fixture = createFixture(unsortedRows, {
          loading: true,
          selectable: true,
          rowKey: (row) => row.name,
        });
        expect(getStateRow(fixture)?.querySelector('td')?.getAttribute('colspan')).toBe('3');
      });

      it('spans every column while empty, without a selection column', () => {
        const fixture = createFixture([]); // 2 columns
        expect(getStateRow(fixture)?.querySelector('td')?.getAttribute('colspan')).toBe('2');
      });

      it('spans every column plus the selection column while empty, when selectable is on', () => {
        const fixture = createFixture([], { selectable: true, rowKey: (row) => row.name });
        expect(getStateRow(fixture)?.querySelector('td')?.getAttribute('colspan')).toBe('3');
      });
    });

    describe('disabled while loading', () => {
      it('disables both pagination buttons', () => {
        const fixture = createFixture(unsortedRows, { loading: true });
        const [previousBtn, nextBtn] = getPageButtons(fixture);

        expect(previousBtn.disabled).toBe(true);
        expect(nextBtn.disabled).toBe(true);
      });

      it('disables a sortable header button', () => {
        const fixture = createFixture(unsortedRows, { loading: true });
        const nameHeaderButton = root(fixture).querySelectorAll('th')[0].querySelector('button');

        expect(nameHeaderButton?.disabled).toBe(true);
      });

      it('disables the header select-all checkbox', () => {
        const fixture = createFixture(unsortedRows, {
          loading: true,
          selectable: true,
          rowKey: (row) => row.name,
        });

        expect(getHeaderCheckbox(fixture).disabled).toBe(true);
      });

      // Not tested for the per-row checkbox: rows never render at all while
      // loading is true (the whole <tbody> is replaced by the state row),
      // so there is no rendered row checkbox to observe during loading.
      // The [disabled]="loading()" binding is still on it in the template,
      // kept for defensive consistency, but it's unreachable in practice
      // given this component's current all-or-nothing tbody replacement.
    });

    describe('custom loadingTemplate / emptyTemplate', () => {
      @Component({
        template: `
          <ng-template #loadingTpl><span class="custom-loading">Custom loading</span></ng-template>
          <ng-template #emptyTpl><span class="custom-empty">Custom empty</span></ng-template>
          <lib-data-grid
            [data]="data"
            [columns]="columns"
            [loading]="loading()"
            [loadingTemplate]="loadingTpl"
            [emptyTemplate]="emptyTpl"
          />
        `,
        imports: [DataGrid],
      })
      class HostWithStateTemplates implements OnInit {
        @ViewChild('loadingTpl', { static: true })
        loadingTpl!: TemplateRef<void>;

        @ViewChild('emptyTpl', { static: true })
        emptyTpl!: TemplateRef<void>;

        data: TestRow[] = [];
        columns: ColumnConfig<TestRow>[] = [];
        // A signal, not a plain field: reassigning a plain field and
        // calling detectChanges() right after trips NG0100 in this
        // Angular/Vitest setup (same root cause and fix as the
        // currentPage/sortState model()s elsewhere in this file, even
        // though this is a plain one-way input, not a two-way binding).
        loading = signal(false);

        ngOnInit(): void {
          this.columns = columns;
        }
      }

      function setupHost(): ComponentFixture<HostWithStateTemplates> {
        TestBed.configureTestingModule({ imports: [HostWithStateTemplates] });
        const fixture = TestBed.createComponent(HostWithStateTemplates);
        fixture.detectChanges();
        return fixture;
      }

      it('renders loadingTemplate instead of the default message', () => {
        const fixture = setupHost();
        fixture.componentInstance.loading.set(true);
        fixture.detectChanges();

        const nativeElement = fixture.nativeElement as HTMLElement;
        expect(nativeElement.querySelector('.custom-loading')?.textContent?.trim()).toBe(
          'Custom loading',
        );
      });

      it('renders emptyTemplate instead of the default message', () => {
        const fixture = setupHost(); // loading false, data empty by default

        const nativeElement = fixture.nativeElement as HTMLElement;
        expect(nativeElement.querySelector('.custom-empty')?.textContent?.trim()).toBe(
          'Custom empty',
        );
      });

      it('loading wins over a custom emptyTemplate when data() is also empty', () => {
        const fixture = setupHost();
        fixture.componentInstance.loading.set(true);
        fixture.detectChanges();

        const nativeElement = fixture.nativeElement as HTMLElement;
        expect(nativeElement.querySelector('.custom-loading')).toBeTruthy();
        expect(nativeElement.querySelector('.custom-empty')).toBeFalsy();
      });
    });
  });

  describe('server mode', () => {
    const fiveRows: TestRow[] = [
      { name: 'Row1', age: 1 },
      { name: 'Row2', age: 2 },
      { name: 'Row3', age: 3 },
      { name: 'Row4', age: 4 },
      { name: 'Row5', age: 5 },
    ];

    it('renders data() entirely, without client-side slicing', () => {
      // pageSize 2 would slice to 2 rows in client mode; server mode never
      // slices, the app is expected to have already sent just one page.
      const fixture = createFixture(fiveRows, { pageSize: 2, mode: 'server', totalCount: 5 });
      expect(getRowCount(fixture)).toBe(5);
    });

    it('derives totalPages() from totalCount(), not data().length', () => {
      // data() here is a single already-fetched page (2 rows), totalCount
      // reports the real total across every page (5).
      const fixture = createFixture(fiveRows.slice(0, 2), {
        pageSize: 2,
        mode: 'server',
        totalCount: 5,
      });
      expect(getPageInfo(fixture)).toBe('Page 1 of 3');
    });

    it('does not reorder data() when a sortable header is clicked', () => {
      const fixture = createFixture(unsortedRows, { mode: 'server', totalCount: unsortedRows.length });
      clickHeader(fixture, 0);
      expect(getNameColumnValues(fixture)).toEqual(['Charlie', 'Alice', 'Bob']);
    });

    it('updates sortState() when a sortable header is clicked, without touching data()', () => {
      const fixture = createFixture(unsortedRows, { mode: 'server', totalCount: unsortedRows.length });
      clickHeader(fixture, 0);

      expect(fixture.componentInstance.sortState()).toEqual({ key: 'name', direction: 'asc' });
      expect(getNameColumnValues(fixture)).toEqual(['Charlie', 'Alice', 'Bob']);
    });

    it('resets currentPage to 1 when totalCount drops below the current page', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2, mode: 'server', totalCount: 5 });
      fixture.componentInstance.currentPage.set(3); // page 3 of 3 (ceil(5/2))
      fixture.detectChanges();
      expect(getPageInfo(fixture)).toBe('Page 3 of 3');

      fixture.componentRef.setInput('totalCount', 2); // now only 1 page (ceil(2/2))
      fixture.detectChanges();
      expect(getPageInfo(fixture)).toBe('Page 1 of 1');
    });

    describe('missing totalCount', () => {
      let errorSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      });

      afterEach(() => {
        errorSpy.mockRestore();
      });

      it('logs a console.error when mode is server and totalCount is left unset', () => {
        createFixture(unsortedRows, { mode: 'server' });
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('totalCount'));
      });

      it('does not log when totalCount is set in server mode', () => {
        createFixture(unsortedRows, { mode: 'server', totalCount: unsortedRows.length });
        expect(errorSpy).not.toHaveBeenCalled();
      });

      it('does not log in client mode even without totalCount', () => {
        createFixture(unsortedRows);
        expect(errorSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('currentPage / sortState as two-way bindings', () => {
    it('setting currentPage directly in client mode is reflected in "Page X of Y" (same signal API as server mode)', () => {
      const fiveRows: TestRow[] = [
        { name: 'Row1', age: 1 },
        { name: 'Row2', age: 2 },
        { name: 'Row3', age: 3 },
        { name: 'Row4', age: 4 },
        { name: 'Row5', age: 5 },
      ];
      const fixture = createFixture(fiveRows, { pageSize: 2 }); // client mode (default)

      fixture.componentInstance.currentPage.set(2);
      fixture.detectChanges();

      expect(getPageInfo(fixture)).toBe('Page 2 of 3');
      expect(getNameColumnValues(fixture)).toEqual(['Row3', 'Row4']);
    });

    it('setting sortState directly in client mode sorts data(), same as clicking the header', () => {
      const fixture = createFixture(unsortedRows);

      fixture.componentInstance.sortState.set({ key: 'name', direction: 'asc' });
      fixture.detectChanges();

      expect(getNameColumnValues(fixture)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    @Component({
      template: `
        <lib-data-grid
          [data]="data"
          [columns]="columns"
          mode="server"
          [pageSize]="2"
          [totalCount]="totalCount"
          [(currentPage)]="currentPage"
          [(sortState)]="sortState"
        />
      `,
      imports: [DataGrid],
    })
    class HostWithServerModels {
      data: TestRow[] = [
        { name: 'Row1', age: 1 },
        { name: 'Row2', age: 2 },
      ];
      columns = twoSortableColumns;
      totalCount = 4;
      // Bound to the grid's currentPage/sortState models as signals, not
      // plain fields: a model() two-way-bound to a plain host property
      // trips NG0100 (ExpressionChangedAfterItHasBeenCheckedError) in
      // tests, since detectChanges()'s second no-op verification pass
      // re-reads a plain field that the grid's own effect()/write already
      // changed mid-cycle. A signal is read reactively instead, so both
      // passes agree by construction; Angular's own two-way binding
      // instructions special-case a signal-valued target for exactly
      // this reason.
      currentPage = signal(1);
      sortState = signal<DataGridSortState<TestRow>>(null);
    }

    function setupHost(): ComponentFixture<HostWithServerModels> {
      TestBed.configureTestingModule({ imports: [HostWithServerModels] });
      const fixture = TestBed.createComponent(HostWithServerModels);
      fixture.detectChanges();
      return fixture;
    }

    function hostRoot(fixture: ComponentFixture<HostWithServerModels>): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    it('setting the host currentPage flows into the grid, reflected in "Page X of Y"', () => {
      const fixture = setupHost();
      expect(hostRoot(fixture).querySelector('.dg-page-info')?.textContent?.trim()).toBe(
        'Page 1 of 2',
      );

      fixture.componentInstance.currentPage.set(2);
      fixture.detectChanges();

      expect(hostRoot(fixture).querySelector('.dg-page-info')?.textContent?.trim()).toBe(
        'Page 2 of 2',
      );
    });

    it('clicking Next in the grid flows currentPage back out to the host', () => {
      const fixture = setupHost();
      const nextButton = hostRoot(fixture).querySelectorAll<HTMLButtonElement>('.dg-page-btn')[1];

      nextButton.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.currentPage()).toBe(2);
    });

    it('clicking a sortable header flows sortState back out to the host', () => {
      const fixture = setupHost();
      const nameHeaderButton = hostRoot(fixture).querySelector<HTMLButtonElement>('th button');

      nameHeaderButton?.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.sortState()).toEqual({ key: 'name', direction: 'asc' });
    });

    it('setting the host sortState flows into the grid, reflected in aria-sort', () => {
      const fixture = setupHost();
      fixture.componentInstance.sortState.set({ key: 'name', direction: 'desc' });
      fixture.detectChanges();

      const nameHeader = hostRoot(fixture).querySelector('th');
      expect(nameHeader?.getAttribute('aria-sort')).toBe('descending');
    });
  });

  describe('row selection', () => {
    it('emits rowClick with the clicked row', () => {
      const fixture = createFixture(unsortedRows);
      const clicked: TestRow[] = [];
      fixture.componentInstance.rowClick.subscribe((row) => clicked.push(row));

      root(fixture).querySelectorAll<HTMLElement>('tbody tr')[1].click();

      expect(clicked).toEqual([unsortedRows[1]]);
    });

    it('emits rowClick when a row is activated with Enter', () => {
      const fixture = createFixture(unsortedRows);
      const clicked: TestRow[] = [];
      fixture.componentInstance.rowClick.subscribe((row) => clicked.push(row));

      root(fixture)
        .querySelectorAll<HTMLElement>('tbody tr')[0]
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(clicked).toEqual([unsortedRows[0]]);
    });

    it('emits rowClick when a row is activated with Space', () => {
      const fixture = createFixture(unsortedRows);
      const clicked: TestRow[] = [];
      fixture.componentInstance.rowClick.subscribe((row) => clicked.push(row));

      root(fixture)
        .querySelectorAll<HTMLElement>('tbody tr')[0]
        .dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

      expect(clicked).toEqual([unsortedRows[0]]);
    });
  });

  describe('edge cases', () => {
    it('handles an empty dataset without breaking', () => {
      const fixture = createFixture([]);
      expect(getRowCount(fixture)).toBe(0);
      expect(getPageInfo(fixture)).toBe('Page 1 of 1');
    });
  });

  describe('custom cell rendering', () => {
    it('renders row[key] as plain text when no cellTemplate/cellClass is set (unchanged default)', () => {
      const fixture = createFixture(unsortedRows);
      const cell = root(fixture).querySelector('tbody tr td') as HTMLElement;

      expect(cell.textContent?.trim()).toBe('Charlie');
      expect(cell.className).toBe('');
    });
  });

  describe('custom cell rendering with cellTemplate and cellClass', () => {
    let hostFixture: ComponentFixture<HostWithCustomCell>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostWithCustomCell],
      }).compileComponents();

      hostFixture = TestBed.createComponent(HostWithCustomCell);
      hostFixture.detectChanges();
    });

    it('renders the cellTemplate content instead of plain row[key] text', () => {
      const nativeElement = hostFixture.nativeElement as HTMLElement;
      const customNameEl = nativeElement.querySelector('.custom-name');

      expect(customNameEl).toBeTruthy();
      expect(customNameEl?.textContent?.trim()).toBe('Charlie');
      // The plain-text fallback must not also render for this column.
      const firstCell = nativeElement.querySelector('tbody tr td:first-child') as HTMLElement;
      expect(firstCell.textContent?.trim()).toBe('Charlie');
    });

    it('applies cellClass per row based on that row\'s own data', () => {
      const nativeElement = hostFixture.nativeElement as HTMLElement;
      const cells = Array.from(nativeElement.querySelectorAll('tbody tr td:first-child'));

      // unsortedRows: Charlie(30) senior, Alice(25) junior, Bob(40) senior
      expect(cells[0].className).toContain('is-senior');
      expect(cells[1].className).toContain('is-junior');
      expect(cells[2].className).toContain('is-senior');
    });

    it('leaves a column without cellTemplate rendering plain text as before', () => {
      const nativeElement = hostFixture.nativeElement as HTMLElement;
      const ageCell = nativeElement.querySelector('tbody tr td:nth-child(2)') as HTMLElement;

      expect(ageCell.textContent?.trim()).toBe('30');
    });
  });
});

describe('DataGrid i18n', () => {
  function createFixtureWithMessages(
    data: TestRow[],
    overrides: Partial<DataGridMessages>,
  ): ComponentFixture<DataGrid<TestRow>> {
    TestBed.configureTestingModule({
      imports: [DataGrid],
      providers: [provideDataGridMessages(overrides)],
    });
    const fixture = TestBed.createComponent(DataGrid<TestRow>);
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('pageSize', 2);
    fixture.detectChanges();
    return fixture;
  }

  it('renders English text by default, with no provider registered', () => {
    TestBed.configureTestingModule({ imports: [DataGrid] });
    const fixture = TestBed.createComponent(DataGrid<TestRow>);
    fixture.componentRef.setInput('data', unsortedRows);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('pageSize', 2);
    fixture.detectChanges();

    const [previousBtn, nextBtn] = getPageButtons(fixture);
    expect(previousBtn.textContent?.trim()).toBe('Previous');
    expect(nextBtn.textContent?.trim()).toBe('Next');
    expect(getPageInfo(fixture)).toBe('Page 1 of 2');
  });

  it('renders Spanish text with provideDataGridMessages(DATA_GRID_MESSAGES_ES)', () => {
    const fixture = createFixtureWithMessages(unsortedRows, DATA_GRID_MESSAGES_ES);

    const [previousBtn, nextBtn] = getPageButtons(fixture);
    expect(previousBtn.textContent?.trim()).toBe('Anterior');
    expect(nextBtn.textContent?.trim()).toBe('Siguiente');
    expect(getPageInfo(fixture)).toBe('Página 1 de 2');
  });

  it('applies a partial override and leaves the rest in English', () => {
    const fixture = createFixtureWithMessages(unsortedRows, { next: () => 'Forward' });

    const [previousBtn, nextBtn] = getPageButtons(fixture);
    expect(previousBtn.textContent?.trim()).toBe('Previous');
    expect(nextBtn.textContent?.trim()).toBe('Forward');
    expect(getPageInfo(fixture)).toBe('Page 1 of 2');
  });

  it('updates the rendered text live when a message reads a signal, without recreating the component', () => {
    const lang = signal<'en' | 'es'>('en');
    const fixture = createFixtureWithMessages(unsortedRows, {
      next: () => (lang() === 'en' ? 'Next' : 'Siguiente'),
    });
    const instance = fixture.componentInstance;

    expect(getPageButtons(fixture)[1].textContent?.trim()).toBe('Next');

    lang.set('es');
    fixture.detectChanges();

    expect(fixture.componentInstance).toBe(instance);
    expect(getPageButtons(fixture)[1].textContent?.trim()).toBe('Siguiente');
  });

  it('renders the Spanish empty message with provideDataGridMessages(DATA_GRID_MESSAGES_ES)', () => {
    const fixture = createFixtureWithMessages([], DATA_GRID_MESSAGES_ES);
    expect(getStateRow(fixture)?.textContent?.trim()).toBe('No hay datos para mostrar');
  });

  it('renders the Spanish loading message with provideDataGridMessages(DATA_GRID_MESSAGES_ES)', () => {
    const fixture = createFixtureWithMessages(unsortedRows, DATA_GRID_MESSAGES_ES);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(getStateRow(fixture)?.textContent?.trim()).toBe('Cargando...');
  });

  it('applies a partial override for empty, leaving the rest in English', () => {
    const fixture = createFixtureWithMessages([], { empty: () => 'Nothing here' });
    expect(getStateRow(fixture)?.textContent?.trim()).toBe('Nothing here');
    expect(getPageInfo(fixture)).toBe('Page 1 of 1');
  });
});

describe('DataGrid header markup', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataGrid] }).compileComponents();
  });

  it('every <th> has scope="col"', () => {
    const fixture = createFixture(unsortedRows);
    const ths = Array.from(root(fixture).querySelectorAll('th'));
    expect(ths.length).toBe(2);
    for (const th of ths) {
      expect(th.getAttribute('scope')).toBe('col');
    }
  });

  it('renders a <button> for a sortable column', () => {
    const fixture = createFixture(unsortedRows);
    const nameHeader = root(fixture).querySelectorAll('th')[0];
    expect(nameHeader.querySelector('button')).toBeTruthy();
  });

  it('renders plain text, no <button>, for a non-sortable column', () => {
    const fixture = createFixture(unsortedRows);
    const ageHeader = root(fixture).querySelectorAll('th')[1];
    expect(ageHeader.querySelector('button')).toBeNull();
    expect(ageHeader.textContent?.trim()).toBe('Age');
  });

  it('cycles aria-sort the same way as before a click at a time: none, ascending, descending, ascending', () => {
    const fixture = createFixture(unsortedRows);
    const nameHeader = root(fixture).querySelectorAll('th')[0];
    expect(nameHeader.getAttribute('aria-sort')).toBe('none');

    clickHeader(fixture, 0);
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');

    clickHeader(fixture, 0);
    expect(nameHeader.getAttribute('aria-sort')).toBe('descending');

    clickHeader(fixture, 0);
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
  });

  it('a non-sortable column has no aria-sort attribute at all', () => {
    const fixture = createFixture(unsortedRows);
    const ageHeader = root(fixture).querySelectorAll('th')[1];
    expect(ageHeader.hasAttribute('aria-sort')).toBe(false);
  });

  it('the sort icon is aria-hidden', () => {
    const fixture = createFixture(unsortedRows);
    const icon = root(fixture).querySelector('.dg-sort-icon');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('DataGrid labelHidden', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataGrid] }).compileComponents();
  });

  it('keeps the label in the DOM, with the sr-only class, for a sortable and a non-sortable column', () => {
    const hiddenLabelColumns: ColumnConfig<TestRow>[] = [
      { key: 'name', label: 'Name', sortable: true, labelHidden: true },
      { key: 'age', label: 'Age', labelHidden: true },
    ];
    const fixture = createFixture(unsortedRows, { columns: hiddenLabelColumns });
    const ths = root(fixture).querySelectorAll('th');

    expect(ths[0].querySelector('.sr-only')?.textContent?.trim()).toBe('Name');
    expect(ths[1].querySelector('.sr-only')?.textContent?.trim()).toBe('Age');
  });

  it('does not add the sr-only class when labelHidden is left unset', () => {
    const fixture = createFixture(unsortedRows);
    const ths = root(fixture).querySelectorAll('th');
    expect(ths[0].querySelector('.sr-only')).toBeNull();
    expect(ths[1].querySelector('.sr-only')).toBeNull();
  });
});

@Component({
  template: `
    <ng-template #actionsCell let-row>
      <button type="button" class="edit-btn" (click)="onEditClick()">Edit</button>
      <a href="#" class="view-link" (click)="onLinkClick($event)">View</a>
    </ng-template>
    <lib-data-grid [data]="data" [columns]="columns" (rowClick)="onRowClickHandler()" />
  `,
  imports: [DataGrid],
})
class HostWithActionsColumn implements OnInit {
  @ViewChild('actionsCell', { static: true })
  actionsCell!: TemplateRef<{ $implicit: TestRow }>;

  data = unsortedRows;
  columns: ColumnConfig<TestRow>[] = [];

  rowClickCount = 0;
  editClickCount = 0;
  linkClickCount = 0;

  ngOnInit(): void {
    this.columns = [
      { key: 'name', label: 'Name', sortable: true },
      { id: 'actions', label: 'Actions', labelHidden: true, cellTemplate: this.actionsCell },
    ];
  }

  onRowClickHandler(): void {
    this.rowClickCount++;
  }

  onEditClick(): void {
    this.editClickCount++;
  }

  onLinkClick(event: Event): void {
    event.preventDefault(); // real navigation isn't the point of this test, and jsdom warns on it otherwise
    this.linkClickCount++;
  }
}

describe('DataGrid display columns', () => {
  function setup(): ComponentFixture<HostWithActionsColumn> {
    TestBed.configureTestingModule({ imports: [HostWithActionsColumn] });
    const fixture = TestBed.createComponent(HostWithActionsColumn);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the display column template with the row, alongside a data column', () => {
    const fixture = setup();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelectorAll('tbody tr').length).toBe(3);
    expect(nativeElement.querySelectorAll('.edit-btn').length).toBe(3);
    expect(nativeElement.querySelectorAll('.view-link').length).toBe(3);
    // The data column ('Name') is still there, coexisting with the display one.
    expect(nativeElement.querySelector('tbody tr td')?.textContent?.trim()).toBe('Charlie');
  });

  it('renders no sort button for the display column, only its (hidden) label', () => {
    const fixture = setup();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const actionsHeader = Array.from(nativeElement.querySelectorAll('th')).find(
      (th) => th.querySelector('.sr-only')?.textContent?.trim() === 'Actions',
    );

    expect(actionsHeader).toBeTruthy();
    expect(actionsHeader?.getAttribute('scope')).toBe('col');
    expect(actionsHeader?.hasAttribute('aria-sort')).toBe(false);
    expect(actionsHeader?.querySelector('button')).toBeNull();
  });
});

describe('DataGrid rowClick with interactive elements inside a cell', () => {
  function setup(): ComponentFixture<HostWithActionsColumn> {
    TestBed.configureTestingModule({ imports: [HostWithActionsColumn] });
    const fixture = TestBed.createComponent(HostWithActionsColumn);
    fixture.detectChanges();
    return fixture;
  }

  it('click on a <button> inside a cellTemplate: rowClick 0 times, the button\'s own handler 1 time', () => {
    const fixture = setup();
    const button = (fixture.nativeElement as HTMLElement).querySelector('.edit-btn') as HTMLButtonElement;

    button.click();

    expect(fixture.componentInstance.editClickCount).toBe(1);
    expect(fixture.componentInstance.rowClickCount).toBe(0);
  });

  it('click on an <a href> inside a cellTemplate: rowClick 0 times, the link\'s own handler 1 time', () => {
    const fixture = setup();
    const link = (fixture.nativeElement as HTMLElement).querySelector('.view-link') as HTMLAnchorElement;

    link.click();

    expect(fixture.componentInstance.linkClickCount).toBe(1);
    expect(fixture.componentInstance.rowClickCount).toBe(0);
  });

  it('click on a plain text cell: rowClick 1 time', () => {
    const fixture = setup();
    const nameCell = (fixture.nativeElement as HTMLElement).querySelector('tbody tr td') as HTMLElement;

    nameCell.click();

    expect(fixture.componentInstance.rowClickCount).toBe(1);
  });

  it('keydown Enter on the focused <tr> itself: rowClick 1 time', () => {
    const fixture = setup();
    const tr = (fixture.nativeElement as HTMLElement).querySelector('tbody tr') as HTMLElement;

    tr.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(fixture.componentInstance.rowClickCount).toBe(1);
  });

  it('keydown Enter on an internal <button>, followed by the click a real browser fires for it: rowClick 0 times', () => {
    const fixture = setup();
    const button = (fixture.nativeElement as HTMLElement).querySelector('.edit-btn') as HTMLButtonElement;

    // jsdom doesn't synthesize the native click a real focused <button>
    // fires for Enter, unlike a real browser (confirmed with Playwright
    // separately) - dispatched explicitly to model that exact sequence.
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    button.click();

    expect(fixture.componentInstance.rowClickCount).toBe(0);
  });

  it('keydown Space on an internal <button>: rowClick 0 times', () => {
    const fixture = setup();
    const button = (fixture.nativeElement as HTMLElement).querySelector('.edit-btn') as HTMLButtonElement;

    button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    expect(fixture.componentInstance.rowClickCount).toBe(0);
  });
});
