import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataGrid } from './data-grid';
import { ColumnConfig } from '../models/column-config';

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
  options: { columns?: ColumnConfig<TestRow>[]; pageSize?: number } = {},
): ComponentFixture<DataGrid<TestRow>> {
  const fixture = TestBed.createComponent(DataGrid<TestRow>);
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('columns', options.columns ?? columns);
  if (options.pageSize !== undefined) {
    fixture.componentRef.setInput('pageSize', options.pageSize);
  }
  fixture.detectChanges();
  return fixture;
}

function root(fixture: ComponentFixture<DataGrid<TestRow>>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function getNameColumnValues(fixture: ComponentFixture<DataGrid<TestRow>>): string[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('tbody tr td:first-child')).map(
    (cell) => cell.textContent?.trim() ?? '',
  );
}

function getRowCount(fixture: ComponentFixture<DataGrid<TestRow>>): number {
  return root(fixture).querySelectorAll('tbody tr').length;
}

function getPageInfo(fixture: ComponentFixture<DataGrid<TestRow>>): string {
  return root(fixture).querySelector('.dg-page-info')?.textContent?.trim() ?? '';
}

function getPageButtons(fixture: ComponentFixture<DataGrid<TestRow>>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.dg-page-btn'));
}

function clickHeader(fixture: ComponentFixture<DataGrid<TestRow>>, index: number): void {
  root(fixture).querySelectorAll<HTMLElement>('th')[index].click();
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
      clickHeader(fixture, 1); // switch to age — should start at asc, not desc

      // Ascending by age: Alice (25), Charlie (30), Bob (40)
      expect(getNameColumnValues(fixture)).toEqual(['Alice', 'Charlie', 'Bob']);
    });

    it('sorts when a sortable header is activated with Enter', () => {
      const fixture = createFixture(unsortedRows);
      root(fixture)
        .querySelectorAll<HTMLElement>('th')[0]
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();

      expect(getNameColumnValues(fixture)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts when a sortable header is activated with Space', () => {
      const fixture = createFixture(unsortedRows);
      root(fixture)
        .querySelectorAll<HTMLElement>('th')[0]
        .dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      fixture.detectChanges();

      expect(getNameColumnValues(fixture)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('keeps the original relative order of rows that tie on the sorted column', () => {
      const rowsWithTie: TestRow[] = [
        { name: 'Bob', age: 40 },
        { name: 'Bob', age: 20 },
        { name: 'Alice', age: 25 },
      ];
      const fixture = createFixture(rowsWithTie);
      clickHeader(fixture, 0); // sort by name ascending — the two "Bob" rows are equal on this column

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
      expect(getPageInfo(fixture)).toBe('Página 1 de 3');
    });

    it('does not advance past the last page', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 });
      clickNext(fixture);
      clickNext(fixture);
      clickNext(fixture); // already on the last page
      expect(getPageInfo(fixture)).toBe('Página 3 de 3');
    });

    it('does not go before the first page', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 });
      clickPrevious(fixture); // already on the first page
      expect(getPageInfo(fixture)).toBe('Página 1 de 3');
    });

    it('goes back a page when clicking Anterior from a later page', () => {
      const fixture = createFixture(fiveRows, { pageSize: 2 });
      clickNext(fixture); // page 2
      clickPrevious(fixture); // back to page 1
      expect(getPageInfo(fixture)).toBe('Página 1 de 3');
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
      expect(getPageInfo(fixture)).toBe('Página 3 de 3');

      fixture.componentRef.setInput('data', fiveRows.slice(0, 2)); // now only 1 page
      fixture.detectChanges();

      expect(getPageInfo(fixture)).toBe('Página 1 de 1');
    });
  });

  describe('sorting + pagination combined', () => {
    it('paginates the already-sorted data, not the original order', () => {
      const fixture = createFixture(unsortedRows, { pageSize: 2 });
      clickHeader(fixture, 0); // sort by name ascending
      clickNext(fixture); // move to page 2

      // Full ascending order is Alice, Bob, Charlie — page 2 (pageSize 2) is just Charlie.
      expect(getNameColumnValues(fixture)).toEqual(['Charlie']);
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
      expect(getPageInfo(fixture)).toBe('Página 1 de 1');
    });
  });
});
