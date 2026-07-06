# ROADMAP.md

This file gets updated often. AGENTS.md/CLAUDE.md don't duplicate it, they
only reference it.

## Phase 0 — Workspace setup (current)

- [x] Create Nx monorepo (`create-nx-workspace`)
- [x] Configure AI agents (`nx configure-ai-agents`)
- [x] Install skills: angular-developer, frontend-design, commit-commands, code-review
- [x] Write AGENTS.md / CLAUDE.md
- [x] Define v1 scope for the first library (pending: definition session)

## Phase 1 — [First library name] v1

Status: being defined.

The full detail (v1 scope, API contract, tasks) lives in
`libs/<name>/ROADMAP.md`, not here — this root file only tracks which
phase/library is the current focus.

## Backlog of future ideas (non-blocking)

- Data Grid — Freemium (core in zhunam-ng-libs, Pro in a separate private repo)
- Dynamic Form Builder — Freemium + SaaS (paid persistence)
- Financial/crypto dashboard — 100% free, not monetizable as a product
- Modular auth system (Firebase/Supabase Auth) — 100% free
- Client-side document (PDF) generator — Mostly free, possible template sales (Gumroad)
- Real-time chat / notifications (embeddable Web Component) — Pure SaaS, main candidate for real revenue
- Calendar with Google Calendar integration — Freemium UI + SaaS sync

> See the monetization definition conversation for the full reasoning
> behind each classification.

## Recurring maintenance notes

- Review each library's `peerDependencies` whenever Angular releases a
  major version (May / November).
- Review whether any API used in `libs/*` stopped meeting the "stable for
  2+ versions" rule.
