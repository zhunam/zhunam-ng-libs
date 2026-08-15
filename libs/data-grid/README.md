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
| `rowClick` | `output<T>`                          | N/A            | Emitted when the user clicks a row.                |

### `ColumnConfig<T>`

| Property   | Type       | Default   | Description                                             |
| ---------- | ---------- | --------- | --------------------------------------------------------- |
| `key`      | `keyof T`  | Required  | Property of `T` this column reads its cell values from. |
| `label`    | `string`   | Required  | Text displayed in the column header.                     |
| `sortable` | `boolean`  | `false`      | Whether clicking the header sorts the grid by this column. |

## Compatibility

`@angular/core` and `@angular/common` `^20.0.0 || ^21.0.0 || ^22.0.0`.

## Why this one

No Tailwind, Bootstrap, or utility-framework dependency. Styling is plain
SCSS behind CSS custom properties, so it drops into any Angular app
regardless of its styling setup. Layout responds to its own container via
Container Queries (`@container`), not the viewport. Accessible by default:
`aria-sort` on sortable headers, visible `:focus-visible` on every
interactive element, full keyboard operability.

## License

MIT

---

Built by Ariana Mora · [LinkedIn](https://www.linkedin.com/in/ariana-andreina-mora) · [GitHub](https://github.com/zhunam)
