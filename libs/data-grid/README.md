# @zhunam/data-grid

A lightweight Angular data table with client-side sorting, pagination, and
row selection. No CSS framework dependency, no runtime dependencies beyond
Angular itself.

## Installation

```bash
npm install @zhunam/data-grid
```

## Usage

```typescript
import { DataGrid, ColumnConfig } from '@zhunam/data-grid';

interface User { name: string; email: string; }
const users: User[] = [{ name: 'Ana', email: 'ana@example.com' }];
const columns: ColumnConfig<User>[] = [{ key: 'name', label: 'Name', sortable: true }];
```

```html
<lib-data-grid [data]="users" [columns]="columns" (rowClick)="onRowClick($event)" />
```

## API

### `DataGrid<T>`

| Name       | Type                                 | Default        | Description                                       |
| ---------- | ------------------------------------ | -------------- | --------------------------------------------------- |
| `data`     | `input<T[]>`                         | `[]`           | Data to render in the table.                       |
| `columns`  | `input.required<ColumnConfig<T>[]>`  | Required       | Configuration of the columns to render, in display order. |
| `pageSize` | `input<number>`                      | `10`           | Number of rows rendered per page.                  |
| `rowClick` | `output<T>`                          | N/A            | Emitted when the user clicks or keyboard-activates (Enter/Space) a row, except when that click or key originates from an interactive element inside one of its cells, see "Display columns" below. |

### `ColumnConfig<T>`

`ColumnConfig<T>` is a union: `DataColumnConfig<T> | DisplayColumnConfig<T>`. A `DataColumnConfig` is bound to a real property of `T`; a `DisplayColumnConfig` isn't bound to any single property, for content that doesn't come from one field, e.g. an actions column. Code that reads a column's `key` (or writes a helper that does) needs to narrow the union first, `'key' in column` is enough: a `DisplayColumnConfig` never has a real `key`.

#### `DataColumnConfig<T>`

| Property       | Type                                    | Default   | Description                                             |
| -------------- | --------------------------------------- | --------- | --------------------------------------------------------- |
| `key`          | `keyof T`                                | Required  | Property of `T` this column reads its cell values from. |
| `label`        | `string`                                 | Required  | Text displayed in the column header.                     |
| `labelHidden`  | `boolean`                                | `false`      | Visually hides `label` while keeping it available to assistive technology. |
| `sortable`     | `boolean`                                | `false`      | Whether clicking the header sorts the grid by this column. |
| `cellTemplate` | `TemplateRef<{ $implicit: T }>`          | None      | Custom template for this column's cells, instead of plain text. |
| `cellClass`    | `(row: T) => string`                     | None      | CSS class(es) applied to this column's cell for a given row. |

#### `DisplayColumnConfig<T>`

| Property       | Type                                    | Default   | Description                                             |
| -------------- | --------------------------------------- | --------- | --------------------------------------------------------- |
| `id`           | `string`                                 | Required  | This column's identity, in place of `key`. Must be unique among every column, `DataColumnConfig`s included, not enforced at runtime. |
| `label`        | `string`                                 | Required  | Text displayed in the column header.                     |
| `labelHidden`  | `boolean`                                | `false`      | Visually hides `label` while keeping it available to assistive technology. |
| `cellTemplate` | `TemplateRef<{ $implicit: T }>`          | Required  | Template rendering this column's cells. Required here, unlike `DataColumnConfig`'s: a display column has no plain-text fallback. |
| `cellClass`    | `(row: T) => string`                     | None      | CSS class(es) applied to this column's cell for a given row. |

A `DisplayColumnConfig` is never sortable, and `cellTemplate` is always required, both enforced at the type level, not just documented.

### `DataGridMessages`

| Member | Type | Description |
| ------ | ---- | ------------ |
| `previous()` | `() => string` | Label of the "previous page" button. |
| `next()` | `() => string` | Label of the "next page" button. |
| `pageStatus(current, total)` | `(current: number, total: number) => string` | Status text between the pagination buttons. |

| Export | Type | Description |
| ------ | ---- | ------------ |
| `DATA_GRID_MESSAGES` | `InjectionToken<DataGridMessages>` | Defaults to `DATA_GRID_MESSAGES_EN`. Prefer `provideDataGridMessages()` over providing this directly. |
| `provideDataGridMessages(overrides)` | `(overrides: Partial<DataGridMessages>) => Provider` | Registers a message override, merged on top of the English defaults. |
| `DATA_GRID_MESSAGES_EN` | `DataGridMessages` | English preset (the default). |
| `DATA_GRID_MESSAGES_ES` | `DataGridMessages` | Spanish preset. |

### Custom cell rendering

```html
<ng-template #imageCell let-coin>
  <img [src]="coin.image" [alt]="coin.name" />
</ng-template>

<lib-data-grid [data]="coins" [columns]="columns" />
```

```typescript
@ViewChild('imageCell', { static: true }) imageCell!: TemplateRef<{ $implicit: Coin }>;

columns: ColumnConfig<Coin>[] = [
  { key: 'image', label: 'Logo', labelHidden: true, cellTemplate: this.imageCell },
  { key: 'change', label: 'Change', cellClass: (c) => (c.change > 0 ? 'is-up' : 'is-down') },
];
```

### Display columns

Use a `DisplayColumnConfig` for a column not backed by any single field, e.g. a row of action buttons:

```typescript
@ViewChild('actionsCell', { static: true }) actionsCell!: TemplateRef<{ $implicit: User }>;

columns: ColumnConfig<User>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { id: 'actions', label: 'Actions', labelHidden: true, cellTemplate: this.actionsCell },
];
```

```html
<ng-template #actionsCell let-user>
  <button type="button" (click)="edit(user)">Edit</button>
  <button type="button" (click)="remove(user)">Delete</button>
</ng-template>
```

No `$event.stopPropagation()` needed inside `edit()`/`remove()`'s click handlers: a click that lands on (or inside) a real interactive element, `button`, `a[href]`, `input`, `select`, `textarea`, `label`, or `[role="button"]`, never triggers `rowClick`, only that element's own handler does. `labelHidden` keeps "Actions" available to a screen reader as the column header's accessible name without showing it visually, since the buttons themselves already make the column's purpose clear on screen.

Keyboard works the same way: Enter/Space only trigger `rowClick` when the row itself has focus, not when they originate from a focused control inside one of its cells, that control's own keyboard handling (native or otherwise) runs instead.

### Theming

`DataGrid` sizes and colors itself via CSS custom properties, part of the
shared `--zhunam-*` namespace used across every `@zhunam/*` library. None
of them are declared on the component's own `:host`, so you can set any
of them from `:root`, from a wrapping element, or scoped directly to
`lib-data-grid`, whichever is more convenient for your app; the closest
ancestor that sets a given property wins, same as any other inherited
CSS custom property.

| Custom property | Default | Description |
| ------------------------------- | -------- | -------------------------------------------------- |
| `--zhunam-primary`               | `#3b82f6` | Sort-icon background/border accents (see `--zhunam-primary-text` for the icon's own color). |
| `--zhunam-primary-text`          | `var(--zhunam-primary)` | Sort-icon color specifically. Falls back to `--zhunam-primary` when unset, so most apps only ever need to set one of the two. |
| `--zhunam-focus`                 | `var(--zhunam-primary)` | Focus outline on sortable headers, rows, and pagination buttons. |
| `--zhunam-text`                  | `#1f2937` | Base text color and pagination button text. |
| `--zhunam-text-secondary`        | `#374151` | Header row and pagination label text. |
| `--zhunam-border`                | `#d1d5db` | Table, cell, and pagination button borders. |
| `--zhunam-radius`                | `0.5rem`  | Table wrapper and pagination button corner radius. |
| `--zhunam-font-family`           | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | Font for the whole component. |
| `--zhunam-font-size`             | `0.9375rem` | Base font size. |
| `--zhunam-transition-duration`   | `150ms`   | Duration of hover/focus color transitions. |
| `--zhunam-grid-header-bg`        | `#f9fafb` | Header row background. |
| `--zhunam-grid-header-hover-bg`  | `rgb(15 23 42 / 6%)` | Header background on hover, for sortable columns. |
| `--zhunam-grid-row-hover-bg`     | `rgb(15 23 42 / 4.5%)` | Row background on hover. |
| `--zhunam-grid-cell-padding-x`   | `1rem` (`0.625rem` below a 28rem container width) | Horizontal cell padding. |
| `--zhunam-grid-cell-padding-y`   | `0.75rem` (`0.5rem` below a 28rem container width) | Vertical cell padding. |

The two cell-padding properties get a tighter default once the component
itself is embedded somewhere narrower than 28rem (a sidebar, a modal),
using Container Queries. If you set either one yourself, that value
applies at every container size, compact included: the component no
longer has its own narrower value to fall back to once you've supplied
one.

### Internationalization

Every string `DataGrid` renders (the pagination buttons and status) comes
from `DATA_GRID_MESSAGES`, an injectable token that defaults to English.

```typescript
import { provideDataGridMessages, DATA_GRID_MESSAGES_ES } from '@zhunam/data-grid';

// app.config.ts, or any component's own `providers`:
providers: [provideDataGridMessages(DATA_GRID_MESSAGES_ES)]
```

A partial override only replaces the messages you specify, the rest stay
in English:

```typescript
providers: [provideDataGridMessages({ next: () => 'Forward' })]
```

Every message is a function, called on every render rather than once at
startup, so one that reads a signal updates live:

```typescript
const language = signal<'en' | 'es'>('en');

providers: [
  provideDataGridMessages({
    previous: () => (language() === 'en' ? 'Previous' : 'Anterior'),
    next: () => (language() === 'en' ? 'Next' : 'Siguiente'),
    pageStatus: (current, total) =>
      language() === 'en' ? `Page ${current} of ${total}` : `Página ${current} de ${total}`,
  }),
]
```

## Compatibility

`@angular/core` and `@angular/common` (new peer dependency, needed for `cellTemplate`'s `NgTemplateOutlet`) `^20.0.0 || ^21.0.0 || ^22.0.0`.

## Why this one

No Tailwind, Bootstrap, or utility-framework dependency. Styling is plain
SCSS behind CSS custom properties, so it drops into any Angular app
regardless of its styling setup. Layout responds to its own container via
Container Queries (`@container`), not the viewport. Accessible by default:
`scope="col"` on every header, `aria-sort` on sortable headers (an
actual `<button>` inside the `<th>`, not a `click`/`keydown` handler on
the header cell itself), visible `:focus-visible` on every interactive
element, full keyboard operability.

## License

MIT

---

Built by Ariana Mora · [LinkedIn](https://www.linkedin.com/in/ariana-andreina-mora) · [GitHub](https://github.com/zhunam)
