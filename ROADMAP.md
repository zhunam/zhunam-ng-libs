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

**Phase 2 — Dynamic Form Builder** — starting. Scope definition session
pending before any component is generated (per the "Checklist: when
creating a new library" in AGENTS.md). Full detail will live in
libs/form-builder/ROADMAP.md once scope is defined.

Phase 1 (Data Grid) is done: `@zhunam/data-grid@1.0.1` is live on the
public npm registry.

## Phases — full sequence

Each phase corresponds to one library. Only the active phase has its
detailed breakdown written out (in its own `libs/<name>/ROADMAP.md`) —
writing full task lists for phases months away tends to go stale before
they're even started, so those stay as a one-line scope stub until their
turn comes.

1. **Data Grid** — `libs/data-grid` — Freemium (core here, Pro in a
   separate private repo) — **DONE, published on npm as `@zhunam/data-grid@1.0.1`**
2. **Dynamic Form Builder** — `libs/form-builder` — Freemium + SaaS (paid
   persistence) — scope definition in progress.
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

- **i18n / customizable text in libs/*** — varias librerías tienen
  strings hardcodeados en un idioma fijo (ej. paginación en español en
  data-grid, botón "Submit" en inglés en form-builder). Evaluar un
  patrón consistente de customización de texto (inputs opcionales para
  labels de UI, o soporte de i18n real) antes de que la lista de
  librerías crezca más y el problema se replique. Detectado en
  libs/data-grid/ROADMAP.md durante el desarrollo de form-builder.

## Recurring maintenance notes

- Review each library's `peerDependencies` whenever Angular releases a
  major version (May / November).
- Review whether any API used in `libs/*` stopped meeting the "stable for
  2+ versions" rule.
