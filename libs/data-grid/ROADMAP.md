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
- [ ] Base component: static table with hardcoded data
      → `libs/data-grid/src/lib/data-grid.component.ts` + `.html`
- [ ] Implement `data`/`columns` inputs, iterate rows/columns in template
      → same files as above
- [ ] Sorting: header click + `computed()` for `sortedData`
      → `data-grid.component.ts`
- [ ] Pagination: `computed()` for `paginatedData`/`totalPages` + nav controls
      → `data-grid.component.ts` + `.html`
- [ ] `rowClick` output
      → `data-grid.component.ts`
- [ ] Encapsulated styles with CSS custom properties
      → `data-grid.component.scss`
- [ ] Full JSDoc on the public API (`data`, `columns`, `pageSize`, `rowClick`)
      → `data-grid.component.ts`
- [ ] Unit tests for sorting and pagination
      → `data-grid.component.spec.ts`
- [ ] Demo consuming the library
      → `apps/portfolio-showcase/src/app/pages/data-grid-demo/`
- [ ] Public README (install, usage example, API table)
      → `libs/data-grid/README.md`
- [ ] Verify production build
      → `nx build data-grid --configuration=production`
