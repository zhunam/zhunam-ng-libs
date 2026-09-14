# Changelog

All notable changes to `@zhunam/data-grid` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

### Added
- `ColumnConfig<T>.cellTemplate`: optional custom cell rendering via
  `TemplateRef<{ $implicit: T }>`, for columns that need more than plain
  text (e.g. an image, a conditionally-styled value). Falls back to the
  existing `{{ row[key] }}` plain-text rendering when not set, no change
  for existing consumers.
- `ColumnConfig<T>.cellClass`: optional `(row: T) => string` for
  conditional per-row CSS classes on a column's cell.

### Changed
- `@angular/common` is now a required peer dependency (`^20.0.0 ||
  ^21.0.0 || ^22.0.0`), needed for `cellTemplate`'s `NgTemplateOutlet`.
  Additive from a usage standpoint (nothing existing breaks), but
  consumers who somehow don't already have `@angular/common` installed
  (unlikely in any real Angular app) would need to add it.

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
