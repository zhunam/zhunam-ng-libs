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
- Multi-column sorting, per-column filters → not scheduled yet,
  free/Pro not decided
- Server-side pagination → done, see Phase 2 below

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

## Phase 2: server-side pagination/sort (done)

### In scope

- `mode: input<'client' | 'server'>` (default `'client'`): `'server'`
  stops the grid from sorting/paginating `data()` itself.
- `totalCount: input<number>`, required in practice for `mode="server"`.
- `currentPage`/`sortState` as `model()`s (two-way bindable), in both
  modes; only meaningful to bind from outside in `mode="server"`.
- `DataGridSortState<T>`, exported: `{ key: string; direction: 'asc' |
  'desc' } | null`.

### Out of scope (unchanged from Phase 1)

- Multi-column sorting, per-column filters, numbered/clickable page
  buttons (still just Previous/Next + "Page X of Y").

### Tasks

- [x] `mode`/`totalCount` inputs, `currentPage`/`sortState` as `model()`,
      `DataGridSortState<T>` exported from the public barrel
      → `data-grid.ts`, `models/sort-state.ts`, `src/index.ts`
- [x] `mode="server"`: `paginatedData()` renders `data()` unsorted/
      unsliced; `totalPages()` derives from `totalCount()` instead of
      `sortedData().length`; the existing auto-reset `effect()` (page
      falls back to 1 when it exceeds `totalPages()`) covers both modes
      with no mode-specific branching, since `totalPages()` already
      picks the right source
      → `data-grid.ts`
- [x] `console.error` (not thrown) when `mode="server"` and
      `totalCount` is left unset
      → `data-grid.ts`
- [x] Unit tests: server mode rendering/sorting, auto-reset against
      `totalCount()`, missing-`totalCount` validation, and
      bidirectional `currentPage`/`sortState` binding via a host
      component with `[(currentPage)]`/`[(sortState)]`, in both modes
      → `data-grid.spec.ts`
- [x] README "Server mode" section with a full usage example; JSDoc on
      every new/changed public member
      → `libs/data-grid/README.md`, `data-grid.ts`
- [x] Verified production build (`nx build data-grid
      --configuration=production`) and a real-browser Playwright check
      confirming `mode="client"` is pixel-for-pixel unchanged and
      `mode="server"` never reorders `data()` on a header click, only
      `sortState`
      → see `CHANGELOG.md` `[Unreleased]`
- [ ] `apps/portfolio-showcase` demo of `mode="server"` (the existing
      `/data-grid` demo and `market-table` both stay in `mode="client"`
      for this phase, unchanged on purpose; a real server-mode demo,
      e.g. paginating `market-table`'s crypto list server-side, is a
      separate task, not required for this API to ship)

## Phase 3: client-side filtering + row selection (done)

Both shipped together in the same release, on the same branch, as two
separate tasks.

### In scope

- `filterFn: input<((row: T) => boolean) | undefined>`: row predicate
  applied before sorting/pagination, `mode="client"` only.
- `selectable`/`rowKey`/`selection`: a built-in checkbox selection
  column (header "select all" + one per row), `selection` as a
  two-way bindable `Set` of row keys.

### Out of scope

- Any built-in search input UI: the app owns that, `filterFn` only
  takes a predicate.
- `filterFn` debouncing: the app debounces whatever signal it derives
  the predicate from, the same way it would before a real request in
  `mode="server"`.
- `filterFn` in `mode="server"`: filtering there is the app's own job,
  the grid renders `data()` unfiltered in that mode.
- Any bulk action over the selection (delete, export, anything else):
  the app owns that, reading `selection()` directly. The grid only
  exposes what's selected.
- Auto-purging `selection()` when a row leaves `data()`: a stale key
  just doesn't match any currently loaded row, the app clears it
  explicitly if that's not the wanted behavior.

### Tasks

- [x] `filterFn` input; new private `filteredData()` computed between
      `data()` and `sortedData()`; `paginatedData()` in `mode="server"`
      keeps reading `data()` directly, never `filteredData()`/
      `sortedData()`, so the filter stays inert there
      → `data-grid.ts`
- [x] Unit tests: rows matching `filterFn`, sorting applied over the
      filtered result (not the full dataset), pagination over the
      filtered result, auto-reset when a stricter filter empties the
      current page, inert in `mode="server"`, dataset restored when
      `filterFn` goes back to `undefined`
      → `data-grid.spec.ts`
- [x] README "Client-side filtering" section with a search-input
      example; JSDoc on `filterFn`
      → `libs/data-grid/README.md`, `data-grid.ts`
- [x] `selectable`/`rowKey`/`selection` inputs/model; a checkbox column
      the grid builds itself (not a `DisplayColumnConfig`, the header
      has no template hook to place one in); `pageSelectionState()`
      computed (`'all' | 'none' | 'some'`) drives the header checkbox's
      `checked`/`indeterminate` (a plain Angular property binding, no
      `ElementRef` needed) and `aria-checked="mixed"`; "select
      all"/"deselect all" only ever touch the current page's keys
      → `data-grid.ts`, `data-grid.html`, `data-grid.scss`
- [x] `selectAll()`/`selectRow()` added to `DataGridMessages`
      → `models/data-grid-messages.ts`
- [x] `console.error` (not thrown) when `selectable` is `true` without
      `rowKey`, same pattern as the `mode="server"`/`totalCount` check
      → `data-grid.ts`
- [x] Unit tests: no checkbox column when `selectable` is `false`
      (identical to before), missing-`rowKey` validation, selecting/
      deselecting one row without affecting others, select-all/
      deselect-all touching only the current page's keys (a
      pre-existing key from another page survives both), indeterminate
      (DOM property) and `aria-checked="mixed"` on a partial page
      selection, `selection()` set from outside reflected in both
      checkboxes, a row checkbox never triggering `rowClick`, select-all
      combined with `filterFn`
      → `data-grid.spec.ts`
- [x] README "Row selection" section with a full usage example
      (including reading `selection()` for an external bulk action);
      JSDoc on `selectable`/`rowKey`/`selection`
      → `libs/data-grid/README.md`, `data-grid.ts`
- [x] Verified production build (`nx build data-grid
      --configuration=production`), `nx build portfolio-showcase
      --configuration=production` (no existing consumer affected,
      `selectable` defaults to `false`), lint clean, and a real-browser
      Playwright check of a real click selecting a row, "select all",
      and the header checkbox's indeterminate state
      → see `CHANGELOG.md` `[Unreleased]`
