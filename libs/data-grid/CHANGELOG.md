# Changelog

All notable changes to `@zhunam/data-grid` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

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
