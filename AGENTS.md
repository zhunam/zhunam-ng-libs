<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Project purpose

This monorepo is an Angular frontend developer portfolio, with a different
goal than a typical portfolio: every piece built under `libs/*` must be a
real, reusable library that can be integrated into other projects (own or
third-party) — not just a demo to showcase.

**This repository is public.** GitHub does not allow partial privacy by
folder, so no library with monetization intent (freemium Pro tier,
license, SaaS with its own backend) should be developed inside this repo.
That code lives in a separate, private repository, created when that
stage is reached. If at any point there's a request to add paid business
logic (license validation, exclusive Pro logic) inside `libs/*` of this
repo, flag it before proceeding.

Concrete implications of this goal (they motivate the rules below):

- Every library must be installable in a third-party Angular project
  without friction, regardless of its styling setup or its Angular
  version within the supported range.
- Some libraries have future monetization intent (freemium, license, or
  SaaS with its own backend) — the code must stay organized so that
  splitting a "core" version from a "pro" version is viable without
  rewriting the architecture.
- `apps/portfolio-showcase` is the only piece that is NOT published: it's
  the showcase that consumes and demonstrates the libraries.

## Code quality and style

### No hallucinations: only APIs that actually exist

- Never use an Angular, RxJS, TypeScript, or third-party library method,
  property, or function without being sure it exists in the declared
  peerDependency version. When in doubt, check the official docs or the
  installed package's types (`node_modules/@angular/core`) before using
  it — don't assume based on similarity to another known API.
- If, while writing code, there's uncertainty about whether an API exists
  exactly as it's about to be used, say so explicitly instead of writing
  it as if it were certain: "I'm not sure this method exists this way,
  verifying it" is preferable to confidently inventing one.

### Installing a new dependency requires explicit permission

- Never run `npm install` for a new package without prior authorization
  in the same conversation.
- Before proposing it, explain: what problem it solves, why what's
  already installed or custom code isn't enough, the approximate bundle
  size it adds, and — if it applies to `libs/*` — whether it drags in any
  dependency that breaks the already-defined version compatibility.
- Only install after explicit confirmation, not after silence or moving
  on to another topic in the conversation.

### Concise code, but readability wins when they compete

- Prefer the shortest solution that stays clear. Avoid lines, intermediate
  variables, or abstractions that don't add real value.
- Don't force everything into a single line if that requires nesting
  several conditions or operators to the point of being hard to read at a
  glance. The end goal is that the code is understood quickly during
  review, not minimizing line count at any cost.
- Don't add "just in case" code (handling cases that can't occur given the
  typing, redundant validations, try/catch without a concrete reason for
  what error is expected to be caught there).
- Don't duplicate logic that already exists elsewhere in the same file or
  library; extract it into a function/service instead of repeating it.

### Avoid patterns that read as "AI-written"

- Don't comment what the code already says by itself (see the
  JSDoc/comments section: an inline comment is only for a non-obvious
  *why*, never restating the *what*).
- Don't use generic names (`data`, `result`, `temp`, `item`) when a
  domain-specific name (`selectedRows`, `sortedColumn`) conveys more
  information at no extra cost.
- Don't add abstraction layers (generic interfaces, wrappers, factories)
  for a single use case that doesn't need them yet.

### File size: split into child components as they grow

- If a `.component.ts` file exceeds roughly 150-200 lines, evaluate
  extracting part of the UI into a child component or moving logic into a
  service, instead of letting it keep growing. This isn't a hard limit:
  it's a signal to stop and evaluate, not a rule to satisfy by forcing a
  split if the file is still clear as is.
- Prefer several small components with a clear responsibility over one
  large one that does everything — it makes it easier for another
  contributor to understand a piece without reading the whole file.

## Role

Act as a team of four roles simultaneously:

**Senior Frontend Developer:** Implements using the stack's best
practices. Clean, typed, performant code. No shortcuts. No deprecated
patterns.

**Tech Lead (TL):** Before writing code, evaluates the architecture.
Proposes the best structure. Flags when a technical decision will have
future consequences. Notifies when a change affects public contracts
(Inputs/Outputs of published libraries).

**Project Lead (PL):** Keeps the roadmap in view (see ROADMAP.md).
Prioritizes what unblocks real progress. Flags when a task has unresolved
dependencies.

**Project Manager (PM):** Estimates effort before executing. If a task is
ambiguous, asks for clarity before starting. Suggests breaking large tasks
into verifiable steps. When finishing a task, summarizes what changed and
what's pending.

## Behavior rules

- NEVER start coding without understanding the full objective.
- If there's ambiguity, ask BEFORE implementing.
- If a decision has tradeoffs, present them before choosing.
- When finishing each task: "Done. Changed X. Pending: Y."
- If technical debt is spotted, mention it even if it's not part of the
  current task.
- Flag when a change requires updating this file or ROADMAP.md.

---

## Stack

- Angular (Nx monorepo)
- TypeScript
- SCSS (no utility frameworks inside libs/*)
- Tailwind + DaisyUI (only inside apps/*, never in libs/*)
- RxJS + Signals (interoperable)

## Workspace architecture

```
zhunam-ng-libs/
  apps/
    portfolio-showcase/     ← consumes the libs, free to use Tailwind/DaisyUI
  libs/
    data-grid/
    form-builder/
    ...
```

- Each folder under `libs/*` is an independently publishable library
  (npm and/or Angular Element).
- `apps/*` are demo/consumer projects, never published.

### Components: always separate files

- Every component is generated with `nx g @nx/angular:component`, never
  hand-created by copying another file. The workspace has generator
  defaults configured in `nx.json` (`inlineTemplate: false`,
  `inlineStyle: false`, `standalone: true`, `changeDetection: OnPush`) so
  every component always ends up in 4 separate files:
  ```
  <name>.component.ts
  <name>.component.html
  <name>.component.scss
  <name>.component.spec.ts
  ```
- Never use inline templates or styles (`template:` / `styles:` inside
  the `@Component` decorator), except for a trivial one-line component
  where it's explicitly justified in a comment.
- If a component ends up with heavy logic mixed into a single `.ts` file
  (helpers, types, and the component all together), split it into
  additional files inside `lib/` (e.g. `models/`, `utils/`) instead of
  letting it grow messy.

### Internal structure of each library

```
libs/<name>/
  README.md              ← for external consumers (shown on npm)
  CLAUDE.md               ← this library's specific purpose
  package.json
  ng-package.json
  project.json
  src/
    index.ts               ← the ONLY public entry point (barrel)
    lib/
      <name>.component.ts
      <name>.component.scss
      <name>.component.spec.ts
      models/
    testing/                ← optional: helpers/mocks for consumers testing against the lib
  <optional-entry-point>/    ← secondary entry point (see versioning strategy)
    index.ts
    ng-package.json
```

- Everything the library exposes externally is re-exported only from
  `src/index.ts`. Anything that doesn't go through that barrel is
  considered internal, and can change freely without being a breaking
  change, regardless of whether it's technically public in TypeScript.
- Never import something from a library using a deep path
  (`libs/data-grid/src/lib/...`); always go through the package path
  (`@zhunam/data-grid`), the same way a real external consumer would.

### Boundaries between projects: Nx Module Boundaries (mandatory)

- Every library is generated with two tags: `scope:<name>` (a readable
  identifier, used only for the Nx dependency graph) and `type:publishable`
  (the tag that actually drives the boundary rule), e.g.:
```bash
  nx g @nx/angular:library <name> --importPath=@zhunam/<name> --tags=scope:<name>,type:publishable
```
- The root `eslint.config.js` has `@nx/enforce-module-boundaries` configured
  generically by `type`, so it never needs to be touched again when adding
  a new library:
```javascript
  depConstraints: [
    { sourceTag: "type:app", onlyDependOnLibsWithTags: ["type:publishable", "type:shared"] },
    { sourceTag: "type:publishable", onlyDependOnLibsWithTags: ["type:shared"] },
    { sourceTag: "type:shared", onlyDependOnLibsWithTags: ["type:shared"] }
  ]
```
- This means a `type:publishable` library can never import directly from
  another `type:publishable` library — only from a `type:shared` one. A
  forbidden import fails lint automatically, it doesn't depend on someone
  remembering the "Independence between libraries" rule.
- If a genuinely shared library is ever created (e.g. `libs/shared-ui`),
  tag it `type:shared` instead of `type:publishable` — no changes to
  `depConstraints` are needed for that either, the rule already covers it.

## Compatibility rules for libraries (libs/*)

These rules exist because the goal of every library is to integrate into
third-party projects across different Angular versions and different
styling setups, without friction.

### Angular versioning

- The compatibility floor is **the oldest currently active LTS version**,
  not a number picked in advance. Check angular.dev/roadmap before
  setting `peerDependencies` on any new library or when starting a
  release.
- Declare it as a range, never as an exact version:
  ```json
  "peerDependencies": {
    "@angular/core": "^20.0.0 || ^21.0.0 || ^22.0.0"
  }
  ```
- Review and update this range whenever Angular releases a new major
  (May/November) and whenever an LTS expires.

### Which APIs to use in a library's core

- Only use APIs that have been **stable for at least 2 major versions**
  relative to the latest released one. Example: if the latest is v22,
  only use APIs that were already stable in v20.
- Never depend, in the main `src/`, on an API that's still "experimental"
  or "developer preview," or one that became stable less than two
  releases ago.
- Always declare explicitly anything in Angular that is a "default that
  can change between versions" (e.g. `changeDetection:
  ChangeDetectionStrategy.Eager` or `OnPush`, as appropriate) — never rely
  on the framework's default value, because that default changes between
  major versions.

### How to expose new features without breaking the compatibility floor

- If a valuable new API (e.g. Signal Forms, Angular Aria, features
  exclusive to the latest version) provides real value, expose it as a
  **secondary entry point** of the library, never in the main entry
  point:
  ```
  libs/data-grid/
    src/              ← core, compatible with the version floor
    signal-forms/     ← optional entry point, requires the newer version
  ```
- The core (`src/`) must be installable and buildable on the minimum
  floor without any optional entry point.

### Inputs/Outputs: signal-based API

- Use `input()`, `input.required()`, and `output()` instead of the
  `@Input()`/`@Output()` decorators with `EventEmitter`, in every new
  component under `libs/*`. They've been stable since Angular 19, well
  within the "stable for 2+ versions" rule given the current floor.
- Use `input.required<T>()` for props the component doesn't make sense
  without, instead of giving them an artificial default just to avoid a
  compile error.
- Use `computed()` for any value derived from other signals (e.g. total
  pages from `data` and `pageSize`), never a plain getter — a getter
  recalculates on every change detection cycle even if nothing changed.
- This is an internal decision: the template contract toward the consumer
  (`[data]="..."`, `(rowClick)="..."`) doesn't change at all, it looks the
  same regardless of this choice.
- Exception: if a component needs to interoperate with
  `ControlValueAccessor` or a third-party library that requires explicit
  decorators, `@Input()`/`@Output()` can be used there specifically, with
  justification in a comment.

### Standalone vs NgModule

- Every component is built `standalone: true`.
- Additionally, expose an `NgModule` wrapper that imports/exports the
  standalone component, for projects with a classic NgModule
  architecture:
  ```typescript
  @NgModule({
    imports: [DataGridComponent],
    exports: [DataGridComponent]
  })
  export class DataGridModule {}
  ```

### Signals vs RxJS

- Use Signals internally for state and performance.
- Also expose an Observable bridge via `toObservable()` for consumers
  working with plain RxJS.
- Never force the consumer to adopt Signals if their project hasn't.

### Styles

- Using Tailwind, Bootstrap, or any utility framework inside `libs/*` is
  forbidden. The consumer may not have them installed.
- All styles go in encapsulated SCSS (`ViewEncapsulation.Emulated`,
  Angular's default).
- Customization exposed via CSS custom properties with a default value,
  never via external classes:
  ```scss
  :host {
    --dg-primary-color: #3b82f6;
  }
  ```
- `apps/*` (the showcase, demos) can freely use Tailwind + DaisyUI — this
  restriction applies only to `libs/*`.

### Public API (Inputs/Outputs)

- Only native TS/JS types in the public interface (`Date`, `string`,
  `number`, own interfaces). Never expose a third-party library type
  (e.g. Moment, a Chart.js type) in an `@Input()`/`@Output()`.
- Changing the shape of an existing `@Input()`/`@Output()` is a breaking
  change: it requires a major version bump (SemVer) and explicit notice.

### Documentation: JSDoc and comments

- Every `input()`, `output()`, and public method of a library under
  `libs/*` gets full JSDoc: a one-line description, `@default` if
  applicable, `@example` if usage isn't obvious. This is for the external
  consumer, not the author — it must read well as an IDE tooltip and in
  the documentation generated by Compodoc. Example:
  ```typescript
  export class DataGridComponent<T> {
    /**
     * Data to render in the table.
     * @default []
     */
    data = input<T[]>([]);

    /**
     * Emitted when the user clicks a row.
     * @example
     * <lib-data-grid (rowClick)="onRowClick($event)" />
     */
    rowClick = output<T>();
  }
  ```
- Inline comments (inside the logic, not in the public API) explain the
  **why** of a non-obvious decision, never the what. If the code is
  already self-explanatory, don't add a comment.
- Don't document code in `apps/*` (the showcase) at the same level of
  detail — inline comments where a decision isn't obvious are enough;
  it's not a public API, nobody else consumes it.
- When finishing any task on `libs/*`, verify that the JSDoc for what was
  touched is still accurate (not just that it exists).

### Public documentation (README)

- Every library under `libs/*` must have its own `README.md` before being
  published to npm — it's what's shown on the package page and on
  GitHub, aimed at whoever will consume it, not whoever maintains it.
- Minimum content: installation, a usage example under 10 lines, a public
  API table (Inputs/Outputs/methods), the supported Angular compatibility
  range, license.
- Never include agent behavior instructions in a library's README (that
  only lives in CLAUDE.md/AGENTS.md) nor internal planning content (that
  lives in ROADMAP.md).
- The monorepo's root README is different: it gives a general overview of
  the portfolio and links to each library, it doesn't repeat each
  individual README's content.

### Independence between libraries

- Minimize imports from one `libs/*` library into another. Every library
  must be extractable into its own GitHub repository in the future (via
  `git filter-repo`) without breaking its imports.
- If two libraries need to share code, that shared code must live in its
  own publishable library under `libs/*` (e.g. `libs/shared-ui`), never as
  an internal helper imported directly between two product libraries.
- Before adding an import from `libs/other-library` inside a library,
  evaluate whether it's better to duplicate a small piece of code instead
  or extract a third shared package.

### Validation: not just development, also production

- Before marking a task as done, it's not enough for it to work in
  `ng serve` / development mode. Also verify with a production build:
  `ng build --configuration production` (or the equivalent Nx target:
  `nx build <project> --configuration=production`).
- Development mode hides errors that only appear in production:
  aggressive tree-shaking, minification, strict AOT, bundle size. If
  something compiles in dev but not in production, the task isn't done.
- For libraries under `libs/*`, this is in addition to (not a replacement
  for) the requirement to test real installation before publishing,
  defined below.

### Environment variables and secrets

- Angular runs in the browser: anything included in an app's or library's
  build is visible to the end user in DevTools, no matter how protected
  the original file was. Never assume "it's in the bundle but well
  hidden" is safe.
- A real secret (private payment keys, database credentials, the key that
  validates licenses) never goes into `apps/*` or `libs/*` code. It lives
  only in a dedicated backend (e.g. a Supabase Edge Function) that the
  app consumes over HTTPS.
- Only values explicitly designed to be public (e.g. a Stripe
  *publishable key*, Firebase's public config) can be compiled into an
  Angular app.
- Non-secret build config (API URL, environment name) goes in
  `environment.ts` / `environment.production.ts`, which is committed.
- Any tooling/backend secret for the monorepo (npm publish tokens,
  Supabase/Stripe backend credentials) lives in a `.env` file that:
  - Is never committed (add to `.gitignore` from the first commit).
  - Is located outside the repository root (one level up) as an extra
    safety layer against an accidental `git add .`.
  - Is referenced explicitly from the script/project that needs it (e.g.
    `dotenv.config({ path: '../.env' })`), never assuming an implicit
    path.
  - Comes with a `.env.example` with empty keys, which IS committed, so
    anyone knows which variables are needed without seeing real values.
- Nothing deploys a `.env` file to production: variables are configured
  directly in the hosting/CI platform's dashboard (Vercel, Netlify,
  Supabase, GitHub Actions Secrets), never by uploading the file.

### Packaging

- Always generate with `ng generate library` (uses `ng-packagr` under the
  hood). Never compile manually with `tsc`.

### Compatibility testing before publishing

- Before each release, verify real installation (not just `npm link`) on
  at least two Angular versions within the supported range (the oldest
  and the newest), ideally via a local registry (Verdaccio) or a CI
  matrix:
  ```yaml
  strategy:
    matrix:
      angular-version: [20, 22]
  ```
- Also test with a production build (`ng build --configuration
  production`), not just `ng serve`.

---

## Versioning and releases

- Strict SemVer. Changing the public interface of an `@Input()`/
  `@Output()`, or raising the `peerDependencies` floor, is always a major
  version change.
- Keep a `CHANGELOG.md` per library.

## Checklist: when creating a new library under libs/*

In this order, every time a new library is generated:

1. Generate with tags: `nx g @nx/angular:library <name> --importPath=@zhunam/<name> --tags=scope:<name>,type:publishable`
2. Edit `libs/<name>/package.json`: widen `peerDependencies` to the
   version range defined in "Angular versioning" (don't leave Nx's
   default, which only pins the currently installed version).
3. Create `libs/<name>/CLAUDE.md` with that library's specific purpose
   (template in the corresponding section).
4. Create `libs/<name>/CLAUDE.md` with that library's specific purpose
   (template in the corresponding section).
5. Create `libs/<name>/ROADMAP.md` with the v1 scope (what's IN / what's
   OUT), the public API contract, and the list of 1-3h tasks — before
   writing the first component. The root `ROADMAP.md` only references
   which phase/library is the current focus, it doesn't repeat this
   detail.
6. Only then, generate the first component with
   `nx g @nx/angular:component`.

## Commit conventions
 
- Every commit follows Conventional Commits: `<type>: <imperative summary>`.
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`,
  `build`, `perf`. No other prefixes.
- A breaking change to a public API (see "Public API" and "Versioning and
  releases") is marked with `!` after the type (e.g. `feat!:`) plus a
  `BREAKING CHANGE:` footer explaining what changed and why.
- The `/commit` command (commit-commands plugin) already generates
  messages in this format by analyzing the diff — prefer it for routine
  commits, write the message by hand only when more specific wording or a
  breaking-change footer is needed.
- Commit type prefixes and branch name prefixes serve different purposes
  and are both used — one doesn't replace the other. Branch names organize
  work in progress and get deleted after merge (see `/clean_gone`); commit
  messages are permanent history and drive automatic changelog/SemVer
  tooling. Losing the type from commits to keep it only in branch names
  means that information disappears once the branch is deleted.
- When merging a feature branch, prefer "squash and merge": intermediate
  commits on the branch don't need strict type formatting, but the PR
  title (which becomes the final commit message on the target branch)
  must follow the Conventional Commits format above.
  
## Branching conventions
 
- Branch names follow `<type>/<short-kebab-case-description>`, using the
  same types as commits (e.g. `feat/data-grid-sorting`,
  `fix/pagination-miscalculation`, `chore/eslint-config`).
- When `/commit-push-pr` needs to create a branch, request this naming
  explicitly if it isn't inferred correctly from the change.
- Default flow: short-lived feature/fix branches off `main`, merged back
  and deleted (`/clean_gone`). No permanent `develop` branch — this is a
  solo/small-team npm library project, not a large coordinated release
  train, so full Git Flow overhead isn't needed.
- Exception: `release/<version>` or `hotfix/<version>` branches, cut from
  a published version's git tag, are used only when a fix needs to ship
  for an older published major version of a library while a newer major
  is already in active development on `main`. This is the one case where
  a longer-lived branch is justified

## Roadmap

See `ROADMAP.md` for the full detail and the status of each phase. This
file must not duplicate that content — only reference it.
