import { ChangeDetectionStrategy, Component, signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ColumnConfig, DataGrid } from '@zhunam/data-grid';
import { mockUsers, userColumns } from '../../shared/mock-users';
import { LibraryPageShell } from '../../shared/library-page-shell/library-page-shell';
import { PackageInfoCard } from '../../shared/package-info-card/package-info-card';
import { dataGridLibrary } from '../../shared/libraries';

// Once a user can freely rename a column's `key` through the JSON editor, the
// row shape is no longer the fixed `User` interface — it's whatever set of
// properties the current columns describe.
type Row = Record<string, unknown>;

@Component({
  selector: 'app-data-grid-demo',
  imports: [DataGrid, RouterLink, LibraryPageShell, PackageInfoCard],
  templateUrl: './data-grid-demo.html',
  styleUrl: './data-grid-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataGridDemo {
  protected readonly library = dataGridLibrary;
  protected readonly selectedUser = signal<Row | null>(null);

  // Both editors below follow the same shape: an in-progress textarea value,
  // and the actual signal the table reads from — only advanced once the
  // textarea holds valid, structurally-sound JSON, so a mid-edit typo never
  // breaks the live table.
  protected readonly users = signal<Row[]>(mockUsers as unknown as Row[]);
  protected readonly usersJsonText = signal(JSON.stringify(mockUsers, null, 2));
  protected readonly usersJsonError = signal<string | null>(null);

  protected readonly columns = signal<ColumnConfig<Row>[]>(
    userColumns as unknown as ColumnConfig<Row>[],
  );
  protected readonly columnsJsonText = signal(JSON.stringify(userColumns, null, 2));
  protected readonly columnsJsonError = signal<string | null>(null);

  protected readonly usageSnippet = `import { DataGrid } from '@zhunam/data-grid';

<lib-data-grid
  [data]="users"
  [columns]="columns"
  [pageSize]="3"
  (rowClick)="onUserRowClick($event)"
/>`;

  protected onUserRowClick(user: Row): void {
    this.selectedUser.set(user);
  }

  protected initial(row: Row): string {
    const name = row['name'];
    return typeof name === 'string' && name.length > 0 ? name.charAt(0) : '?';
  }

  protected onColumnsJsonInput(value: string): void {
    this.columnsJsonText.set(value);

    const parsed = this.parseJson(value, this.columnsJsonError);
    if (!parsed) return;

    const validationError = this.validateColumns(parsed);
    if (validationError) {
      this.columnsJsonError.set(validationError);
      return;
    }

    this.columnsJsonError.set(null);
    const nextColumns = parsed as ColumnConfig<Row>[];
    this.syncRowsWithColumns(this.columns(), nextColumns);
    this.columns.set(nextColumns);
  }

  protected onUsersJsonInput(value: string): void {
    this.usersJsonText.set(value);

    const parsed = this.parseJson(value, this.usersJsonError);
    if (!parsed) return;

    const expectedKeys = this.columns().map((column) => column.key as string);
    const validationError = this.validateRows(parsed, expectedKeys);
    if (validationError) {
      this.usersJsonError.set(validationError);
      return;
    }

    this.usersJsonError.set(null);
    this.users.set(parsed as Row[]);
  }

  private parseJson(value: string, error: WritableSignal<string | null>): unknown[] | null {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        error.set('Expected a JSON array.');
        return null;
      }
      return parsed;
    } catch (parseError) {
      error.set(parseError instanceof Error ? parseError.message : 'Invalid JSON.');
      return null;
    }
  }

  // Each column object may only carry the fields DataGrid actually reads —
  // a renamed field (e.g. "key" typed as "ky") would silently stop working,
  // so it's rejected here instead of applied.
  private validateColumns(parsed: unknown[]): string | null {
    const allowedKeys = new Set(['key', 'label', 'sortable']);

    for (const [index, item] of parsed.entries()) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return `Column ${index + 1}: expected an object.`;
      }

      const unknownKey = Object.keys(item).find((key) => !allowedKeys.has(key));
      if (unknownKey) {
        return `Column ${index + 1}: unexpected property "${unknownKey}"; only "key", "label", and "sortable" are allowed.`;
      }

      const row = item as Row;
      if (typeof row['key'] !== 'string' || row['key'] === '') {
        return `Column ${index + 1}: "key" must be a non-empty string.`;
      }
      if (typeof row['label'] !== 'string' || row['label'] === '') {
        return `Column ${index + 1}: "label" must be a non-empty string.`;
      }
      if ('sortable' in row && typeof row['sortable'] !== 'boolean') {
        return `Column ${index + 1}: "sortable" must be true or false.`;
      }
    }

    return null;
  }

  // Every row must expose exactly the properties the current columns point
  // at — a renamed property (e.g. "name" typed as "nam") would leave that
  // column blank, so it's rejected here instead of applied.
  private validateRows(parsed: unknown[], expectedKeys: string[]): string | null {
    const expected = new Set(expectedKeys);

    for (const [index, item] of parsed.entries()) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return `Row ${index + 1}: expected an object.`;
      }

      const keys = Object.keys(item);
      const unknownKey = keys.find((key) => !expected.has(key));
      if (unknownKey) {
        return `Row ${index + 1}: unexpected property "${unknownKey}"; column keys are ${expectedKeys.join(', ')}.`;
      }

      const missingKey = expectedKeys.find((key) => !keys.includes(key));
      if (missingKey) {
        return `Row ${index + 1}: missing "${missingKey}".`;
      }
    }

    return null;
  }

  // "Edit data" never lets the user type a row's property names directly
  // (validateRows rejects any row whose keys don't exactly match the current
  // columns) — so whenever a column is added, removed, or has its `key`
  // changed, this is the only place that reshapes the rows to match, rather
  // than leaving the user stuck looking at a "missing" error with no way to
  // fix it themselves.
  //
  // Column identity is tracked by set difference, not array position: adding
  // a column shifts every later index without renaming anything, and the
  // same is true for removing or reordering one. Only when exactly one key
  // disappeared and exactly one new key appeared is it treated as a rename —
  // the existing value carries over under the new name. Any other new key
  // (a genuine addition, or one of several changes at once) starts blank
  // (`''`), waiting for the user to fill it in; any key that's no longer in
  // a column is simply dropped from the rows.
  private syncRowsWithColumns(previous: ColumnConfig<Row>[], next: ColumnConfig<Row>[]): void {
    const previousKeys = previous.map((column) => column.key as string);
    const nextKeys = next.map((column) => column.key as string);
    const previousKeySet = new Set(previousKeys);
    const nextKeySet = new Set(nextKeys);

    const removedKeys = previousKeys.filter((key) => !nextKeySet.has(key));
    const addedKeys = nextKeys.filter((key) => !previousKeySet.has(key));
    if (removedKeys.length === 0 && addedKeys.length === 0) return;

    const rename =
      removedKeys.length === 1 && addedKeys.length === 1
        ? { from: removedKeys[0], to: addedKeys[0] }
        : null;

    const syncedRows = this.users().map((row) => {
      const nextRow: Row = {};
      for (const key of nextKeys) {
        if (key in row) {
          nextRow[key] = row[key];
        } else if (rename && key === rename.to && rename.from in row) {
          nextRow[key] = row[rename.from];
        } else {
          nextRow[key] = '';
        }
      }
      return nextRow;
    });

    this.users.set(syncedRows);
    this.usersJsonText.set(JSON.stringify(syncedRows, null, 2));
  }
}
