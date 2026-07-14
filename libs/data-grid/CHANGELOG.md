# Changelog

All notable changes to `@zhunam/data-grid` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

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
- `data-grid.spec.ts` — 21 unit tests covering sorting, pagination, keyboard activation (Enter/Space on sortable headers and rows), row selection, and stable-sort tie-breaking. Runs clean in CI (GitHub Actions, `ubuntu-latest`) with coverage above 80% on statements, branches, functions, and lines. (The `nx test` failure previously noted here was specific to one contributor's local Windows environment, not a real dependency or workspace issue — see `libs/data-grid/ROADMAP.md`.)
