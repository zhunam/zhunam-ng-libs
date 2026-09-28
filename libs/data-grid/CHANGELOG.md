# Changelog

All notable changes to `@zhunam/data-grid` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

## [4.1.0] - 2026-09-28

### Added
- `mode` input (`'client' | 'server'`, default `'client'`): `'server'` stops
  `DataGrid` from sorting/paginating `data()` itself, rendering it as
  received instead, for an app that owns the real fetch. See the README's
  new "Server mode" section.
- `totalCount` input: total row count across every page, required in
  practice for `mode="server"` (there's no other way to derive
  `totalPages()`), ignored in `mode="client"`. Logs a `console.error`
  (not a thrown error) when `mode="server"` and `totalCount` is left
  unset.
- `DataGridSortState<T>` type, exported from the public barrel:
  `{ key: string; direction: 'asc' | 'desc' } | null`, the shape of the
  new `sortState` model.

### Changed
- `currentPage` is now a `model()` (two-way bindable) instead of an
  internal signal. Not a breaking change: existing markup that never
  binds `currentPage` (every consumer in this workspace, as of this
  release) keeps behaving identically in `mode="client"`, the default.
  Only a consumer that needs to read or drive the current page from
  outside needs `[(currentPage)]`, previously impossible.
- `sortState` (the toggle a sortable header's click already drove) is
  now a `model()` too, of type `DataGridSortState<T>`, for the same
  reason and with the same non-breaking guarantee: unbound, it behaves
  exactly like the internal state it replaces.

## [4.0.0] - 2026-09-26

### Changed
- **BREAKING**: default language of every rendered string (pagination
  buttons and status) is now English instead of Spanish. Use
  `provideDataGridMessages(DATA_GRID_MESSAGES_ES)` to restore the
  previous text.
- **BREAKING**: `--zhunam-*` defaults are no longer declared on the
  component's own `:host`. A consumer stylesheet that already set one of
  these properties on an ancestor of `lib-data-grid` (e.g. `:root`) that
  is less specific than `:host` will now see that value actually apply,
  where it was silently overridden before: `:host`'s own declaration
  always won the cascade regardless of the ancestor rule's specificity.
  No default value changed.
- **BREAKING**: `ColumnConfig<T>` is now a union,
  `DataColumnConfig<T> | DisplayColumnConfig<T>`. Code that reads a
  column's `key` needs to narrow first (`'key' in column` is enough): a
  `DisplayColumnConfig` never has a real `key`. Existing configuration
  objects that only ever set `key` keep working unchanged, only code
  written against the old single-interface `ColumnConfig<T>` and
  reaching into `.key` directly needs an update.
- **BREAKING**: `rowClick` is no longer emitted when the triggering click
  lands on (or inside) an interactive element (`button`, `a[href]`,
  `input`, `select`, `textarea`, `label`, `[role="button"]`) inside a
  cell, nor when the triggering Enter/Space key event originates from an
  element other than the row itself. A consumer previously relying on
  `rowClick` firing regardless (e.g. by calling
  `$event.stopPropagation()` inside a `cellTemplate`'s own handler to get
  the opposite effect) sees a behavior change.
- **BREAKING**: a sortable column's header is now an actual `<button>`
  inside the `<th>`, not the `<th>` itself with a `click`/`keydown`
  handler and `tabindex`. Consumer CSS that specifically targeted the
  sortable `<th>` as the interactive/focusable element (e.g. a
  `:focus`/`:focus-visible` rule on `.dg-th--sortable` itself) no longer
  matches; target the header's own `<button>` instead.

### Added
- `DataGridMessages`, `DATA_GRID_MESSAGES` (`InjectionToken`),
  `provideDataGridMessages()`, `DATA_GRID_MESSAGES_EN`,
  `DATA_GRID_MESSAGES_ES`: translate the pagination buttons and status
  text. Every message is a function evaluated on render, so one that
  reads a signal updates live.
- `--zhunam-primary-text` custom property (default `var(--zhunam-primary)`):
  the sort icon's own text color, independent from `--zhunam-primary`
  (which now only controls its background/border accents).
- `DisplayColumnConfig<T>`: a column not backed by any single property of
  `T`, for content that doesn't come from one field, e.g. an actions
  column. See the README's "Display columns" section.
- `labelHidden` on both `DataColumnConfig` and `DisplayColumnConfig`:
  visually hides a column's header `label` while keeping it available to
  assistive technology (a standard `sr-only` pattern), instead of the
  column having no accessible name at all when `label` is left empty.

### Fixed
- Every `<th>` now has `scope="col"`, giving assistive technology an
  explicit header/cell association that previously relied only on
  implicit browser table heuristics.
- A sortable column's header is keyboard-operable through a real
  `<button>` rather than a `tabindex`-ed `<th>` with manual `click`/
  `keydown` handlers, the more conventional and broadly-supported
  accessible pattern for an actionable table header.

## [3.0.0] - 2026-09-17

### Changed
- **BREAKING**: every CSS custom property is renamed to the shared
  `--zhunam-*` namespace, unified across all `@zhunam/*` libraries so
  they use one consistent name per theming role instead of a
  library-specific prefix. No compatibility aliases are kept for the
  old names; update any stylesheet that sets one of them.
- **BREAKING**: `--zhunam-border` (formerly `--dg-border-color`)
  defaults to `#d1d5db` instead of `#e5e7eb`, aligned with the same
  default already used by `@zhunam/form-builder` and
  `@zhunam/calendar`'s toolbar. A visible, slightly darker border for
  consumers who never overrode this property.
- `:focus-visible` on sortable headers, rows, and pagination buttons now
  reads `--zhunam-focus` (falls back to `--zhunam-primary`) instead of
  `--zhunam-primary` directly, matching the same focus/brand-color
  decoupling `@zhunam/form-builder` already had.
- Every `var()` usage now carries an inline fallback matching its
  `:host` default, so the component degrades gracefully if that
  declaration is ever missing instead of resolving to an invalid value.

| Old name | New name |
| ----------------------- | -------------------------------- |
| `--dg-font-family`      | `--zhunam-font-family`           |
| `--dg-font-size`        | `--zhunam-font-size`             |
| `--dg-text-color`       | `--zhunam-text`                  |
| `--dg-header-text-color`| `--zhunam-text-secondary`        |
| `--dg-header-bg`        | `--zhunam-grid-header-bg`        |
| `--dg-border-color`     | `--zhunam-border`                |
| `--dg-row-hover-bg`     | `--zhunam-grid-row-hover-bg`     |
| `--dg-header-hover-bg`  | `--zhunam-grid-header-hover-bg`  |
| `--dg-primary-color`    | `--zhunam-primary`               |
| `--dg-radius`           | `--zhunam-radius`                |
| `--dg-cell-padding-y`   | `--zhunam-grid-cell-padding-y`   |
| `--dg-cell-padding-x`   | `--zhunam-grid-cell-padding-x`   |
| `--dg-transition-duration` | `--zhunam-transition-duration` |
| _(none, used `--dg-primary-color` directly)_ | `--zhunam-focus` |

## [2.0.0] - 2026-09-13

### Added
- `ColumnConfig<T>.cellTemplate`: optional custom cell rendering via
  `TemplateRef<{ $implicit: T }>`, for columns that need more than plain
  text (e.g. an image, a conditionally-styled value). Falls back to the
  existing `{{ row[key] }}` plain-text rendering when not set, no change
  for existing consumers.
- `ColumnConfig<T>.cellClass`: optional `(row: T) => string` for
  conditional per-row CSS classes on a column's cell.

### Changed
- **BREAKING**: `@angular/common` is now a required peer dependency
  (`^20.0.0 || ^21.0.0 || ^22.0.0`), needed for `cellTemplate`'s
  `NgTemplateOutlet`. Nothing existing breaks at the usage level, but
  consumers who don't already have `@angular/common` installed (unlikely
  in any real Angular app) need to add it, which is why this ships as a
  major version.

## [1.1.0] - 2026-08-17

### Added
- `DataGridModule`: NgModule wrapper around the standalone `DataGrid`
  component (`imports: [DataGrid]`, `exports: [DataGrid]`), for
  consumers still on a classic NgModule architecture. Additive, no
  breaking change to the existing standalone contract.

## [1.0.1] - 2026-07-14

### Fixed
- Corrected `license` field in package.json (was missing/defaulting to
  "Proprietary" instead of MIT).

## [1.0.0] - 2026-07-13

### Added
- `DataGrid<T>` standalone component with client-side rendering from a `data` input.
- Single-column sorting (ascending/descending) via sortable column headers.
- 100% client-side pagination with configurable `pageSize`.
- `rowClick` output, emitting the clicked record.
- `ColumnConfig<T>` model for declarative column setup.
- Encapsulated SCSS styling via CSS custom properties (`--dg-*`), no external CSS framework dependency.
- `NgModule` wrapper (`DataGridModule`) for classic NgModule consumers.
- Full public API JSDoc (IDE tooltips + Compodoc-ready).
- `@angular/core` / `@angular/common` compatibility: `^20.0.0 || ^21.0.0 || ^22.0.0`.

### Testing
- `data-grid.spec.ts`: 21 unit tests covering sorting, pagination, keyboard activation (Enter/Space on sortable headers and rows), row selection, and stable-sort tie-breaking. Runs clean in CI (GitHub Actions, `ubuntu-latest`) with coverage above 80% on statements, branches, functions, and lines. (The `nx test` failure previously noted here was specific to one contributor's local Windows environment, not a real dependency or workspace issue; see `libs/data-grid/ROADMAP.md`.)
