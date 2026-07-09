# ROADMAP.md

This file gets updated often. AGENTS.md/CLAUDE.md don't duplicate it, they
only reference it.

## Phase 0 — Workspace setup (current)

- [x] Create Nx monorepo (`create-nx-workspace`)
- [x] Configure AI agents (`nx configure-ai-agents`)
- [x] Install skills: angular-developer, frontend-design, commit-commands, code-review
- [x] Write AGENTS.md / CLAUDE.md
- [x] Define v1 scope for the first library (pending: definition session)

## Active phase

**Phase 1 — Data Grid v1** — **done**. Full detail — scope, API contract,
task list — lives in `libs/data-grid/ROADMAP.md`. One known exception, not
a pending item: the unit test suite (`data-grid.spec.ts`) is written and
compiles clean, but can't currently execute due to a pre-existing Vitest
4.x / `@angular/build` 21.2.18 integration bug affecting the whole
workspace (documented in that file) — re-run `nx test data-grid` once
upstream fixes land.

Phase 2 (Dynamic Form Builder) has not started yet.

## Phases — full sequence

Each phase corresponds to one library. Only the active phase has its
detailed breakdown written out (in its own `libs/<name>/ROADMAP.md`) —
writing full task lists for phases months away tends to go stale before
they're even started, so those stay as a one-line scope stub until their
turn comes.

1. **Data Grid** — `libs/data-grid` — Freemium (core here, Pro in a
   separate private repo) — **DONE**
2. **Dynamic Form Builder** — `libs/form-builder` — Freemium + SaaS (paid
   persistence) — not started
3. **Financial/crypto dashboard** — `apps/` (portfolio piece, not a
   publishable lib) — 100% free, not monetizable as a product — not started
4. **Modular auth system** — `libs/auth` (thin wrapper/starter around
   Firebase/Supabase Auth) — 100% free — not started
5. **Client-side document (PDF) generator** — `libs/pdf-generator` —
   mostly free, possible template sales (Gumroad) — not started
6. **Real-time chat / notifications** — `libs/chat-widget` (embeddable
   Web Component) — pure SaaS, main candidate for real revenue — not started
7. **Calendar with Google Calendar integration** — `libs/calendar` —
   freemium UI + SaaS sync — not started


## Future ideas (not yet phased)

Anything beyond the 7 above goes here first, unordered, until it's
promoted into the numbered sequence above.

- (none yet)

## Recurring maintenance notes

- Review each library's `peerDependencies` whenever Angular releases a
  major version (May / November).
- Review whether any API used in `libs/*` stopped meeting the "stable for
  2+ versions" rule.
