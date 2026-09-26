import { TemplateRef } from '@angular/core';
import { DataColumnConfig, DisplayColumnConfig } from './column-config';

// Type-only spec: every assertion here is a compile-time check using
// TypeScript's expect-an-error-here comment directive, verified by
// running `tsc --noEmit` against this project's tsconfig.spec.json, not
// by vitest assertions. The single `it()` below exists only so vitest
// (which otherwise reports "no tests found" for a file with none) has
// something to run; it carries no meaningful runtime behavior of its own.

interface TestRow {
  name: string;
  age: number;
}

const template = null as unknown as TemplateRef<{ $implicit: TestRow }>;

// A real, valid DataColumnConfig: no error expected.
const validDataColumn: DataColumnConfig<TestRow> = { key: 'name', label: 'Name', sortable: true };

// A real, valid DisplayColumnConfig: no error expected.
const validDisplayColumn: DisplayColumnConfig<TestRow> = {
  id: 'actions',
  label: 'Actions',
  cellTemplate: template,
};

// @ts-expect-error - 'bogus' is not a key of TestRow.
const dataColumnWithUnknownKey: DataColumnConfig<TestRow> = { key: 'bogus', label: 'Bogus' };

const sortableDisplayColumn: DisplayColumnConfig<TestRow> = {
  id: 'actions',
  label: 'Actions',
  // @ts-expect-error - DisplayColumnConfig.sortable is typed `never`, a display column can't be sortable.
  sortable: true,
  cellTemplate: template,
};

// @ts-expect-error - DisplayColumnConfig.cellTemplate is required, unlike DataColumnConfig's.
const displayColumnWithoutTemplate: DisplayColumnConfig<TestRow> = { id: 'actions', label: 'Actions' };

it('type-checks only, see the @ts-expect-error comments above', () => {
  // Referenced so nothing above is flagged as an unused local; the real
  // assertions already happened above, at compile time.
  void [validDataColumn, validDisplayColumn, dataColumnWithUnknownKey, sortableDisplayColumn, displayColumnWithoutTemplate];
  expect(true).toBe(true);
});
