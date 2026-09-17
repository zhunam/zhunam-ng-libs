# ROADMAP: Data Grid

## Phase 1: v1 (done)

### In scope

- Render data from an array received via input
- Single-column sorting (asc/desc)
- 100% client-side pagination
- Row click → emits the clicked record (`rowClick`)
- Column configuration via input

### Out of scope

- Virtual scroll, Excel export, column drag & drop → Pro (private repo)
- Multi-select with checkboxes → Pro (private repo)
- Server-side pagination, multi-column sorting, per-column filters → v2,
  free/Pro not decided yet

### Known issues / tech debt

- Pagination UI text ("Anterior", "Siguiente", "Página X de Y" in
  `data-grid.html`) is hardcoded in Spanish, inconsistent with the
  library's English README/JSDoc and the rest of the portfolio site.
  Found while building the form-builder demo (2026-08-05), which
  originally copied the same convention ("Enviar") before it was
  corrected to English there. Not fixed here yet since v1.0.1 is
  already published to npm. Plan a v1.1 that either translates these
  strings to English or, better, exposes them as configurable
  `input()`s so consumers can localize them.

### Tasks

- [x] Generate library with tags + adjust peerDependencies
      → `libs/data-grid/package.json`
- [x] Create `ColumnConfig<T>`
      → `libs/data-grid/src/lib/models/column-config.ts`
- [x] Base component: static table with hardcoded data
      → `libs/data-grid/src/lib/data-grid/data-grid.ts` + `.html`
- [x] Implement `data`/`columns` inputs, iterate rows/columns in template
      → same files as above
- [x] Sorting: header click + `computed()` for `sortedData`
      → `data-grid.ts`
- [x] Pagination: `computed()` for `paginatedData`/`totalPages` + nav controls
      → `data-grid.ts` + `.html`
- [x] `rowClick` output
      → `data-grid.ts`
- [x] Encapsulated styles with CSS custom properties
      → `data-grid.scss`
- [x] Full JSDoc on the public API (`data`, `columns`, `pageSize`, `rowClick`)
      → `data-grid.ts`
- [x] Unit tests for sorting, pagination, keyboard activation, and row selection
      → `data-grid.spec.ts`: 21 tests (14 from the original suite + 7 added
      for keyboard activation, row selection, and stable-sort tie-breaking).
      The earlier "Vitest 4.x / `@angular/build` 21.2.18 fails at
      `angular:test-bed-init`" failure was specific to the local agent's
      Windows environment, not the workspace or the pinned dependency
      versions: `nx test data-grid --coverage` runs clean in CI (GitHub
      Actions, `ubuntu-latest`), all 21 tests passing with coverage above
      80% on statements, branches, functions, and lines.
- [x] Demo consuming the library
      → `apps/portfolio-showcase/src/app/pages/data-grid-demo/`
- [x] Public README (install, usage example, API table)
      → `libs/data-grid/README.md`
- [x] Verify production build
      → `nx build data-grid --configuration=production`: confirmed clean
      after every task this phase touched (`data-grid.ts`, `.html`, `.scss`);
      no need to re-run once more just to close the checkbox.
- [x] `DataGridModule` NgModule wrapper for classic NgModule consumers
      → `libs/data-grid/src/lib/data-grid/data-grid.module.ts`, exported
      from `src/index.ts`. Additive change, no breaking change to the
      existing standalone `DataGrid` contract; still needs a version
      bump before republishing (new public surface). Resolves the tech
      debt logged in the root `ROADMAP.md` under "Future ideas".
- [x] `ColumnConfig<T>.cellTemplate` + `cellClass`: custom cell
      rendering via `TemplateRef`, for consumers needing more than plain
      text per cell (e.g. an image, conditional coloring). Driven by a
      real need found building the crypto-dashboard's `market-table`
      (`apps/portfolio-showcase`): plain-text-only cells couldn't show
      a coin's image or color-code its price change. Additive, existing
      consumers unaffected when neither is set. Adds `@angular/common`
      as a new required peer dependency (`NgTemplateOutlet`); still
      needs a version bump before republishing.
- [x] Renamed every CSS custom property to the shared `--zhunam-*`
      namespace (`--dg-primary-color` → `--zhunam-primary`, etc.), part
      of a workspace-wide migration unifying theming roles across all 5
      `@zhunam/*` libraries so a consumer using more than one sees one
      consistent name per role instead of a different prefix per
      library. `--zhunam-border` also changes its default from
      `#e5e7eb` to `#d1d5db` to match the value already used by
      `@zhunam/form-builder`/`@zhunam/calendar`. `:focus-visible` now
      reads a new `--zhunam-focus` property (defaults to
      `--zhunam-primary`) instead of the primary color directly, and
      every `var()` usage gained an inline fallback matching its
      `:host` default. No compatibility aliases kept for the old names
      (breaking change, major version bump). Full rename table in
      `CHANGELOG.md`.
