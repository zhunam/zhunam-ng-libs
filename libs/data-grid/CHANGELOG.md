# Changelog

All notable changes to `@zhunam/data-grid` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

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

### Known limitations
- Unit test suite (`data-grid.spec.ts`) is written and compiles clean, but cannot currently execute in this workspace due to a Vitest 4.x / `@angular/build` 21.2.18 integration bug (tracked in `libs/data-grid/ROADMAP.md`). Will re-run once upstream fixes land.
