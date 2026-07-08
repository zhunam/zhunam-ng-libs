# ROADMAP — Data Grid

## Phase 1 — v1 (in progress)

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
- [ ] Unit tests for sorting and pagination
      → `data-grid.spec.ts` — code written and compiles clean, but `nx test`
      can't currently execute it in this workspace: a pre-existing Vitest
      4.x / `@angular/build` 21.2.18 integration bug fails every project's
      tests (confirmed on the untouched `portfolio-showcase` default spec
      too) at the `angular:test-bed-init` virtual file. Not fixable via
      version pinning (tried 4.0.8, the declared peer — same failure);
      the only newer option is an Angular 22 major upgrade, out of scope
      here. Re-run `nx test data-grid` once upstream fixes land.
- [ ] Demo consuming the library
      → `apps/portfolio-showcase/src/app/pages/data-grid-demo/`
- [ ] Public README (install, usage example, API table)
      → `libs/data-grid/README.md`
- [ ] Verify production build
      → `nx build data-grid --configuration=production`
