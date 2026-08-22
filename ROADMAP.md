# ROADMAP.md

This file gets updated often. AGENTS.md/CLAUDE.md don't duplicate it, they
only reference it.

## Phase 0: Workspace setup (current)

- [x] Create Nx monorepo (`create-nx-workspace`)
- [x] Configure AI agents (`nx configure-ai-agents`)
- [x] Install skills: angular-developer, frontend-design, commit-commands, code-review
- [x] Write AGENTS.md / CLAUDE.md
- [x] Define v1 scope for the first library (pending: definition session)

## Active phase

**Phase 4: Client-side document (PDF) generator**, waiting to start
(scope definition session pending, per the same process used for
previous phases).

Phase 3 (Modular auth system) is done and published: `@zhunam/auth@1.0.0`
is live on the public npm registry, alongside `@zhunam/data-grid@1.1.0`
and `@zhunam/form-builder@1.1.0` (both bumped to 1.1.0 for the NgModule
wrapper addition). All three published libraries were also manually
verified against real Firebase and Supabase projects before this
release, not just tested against mocks.

## Phases: full sequence

Each phase corresponds to one library (or, for the last phase, one
app piece). Only the active phase has its detailed breakdown written
out (in its own `libs/<name>/ROADMAP.md`). Writing full task lists for
phases months away tends to go stale before they're even started, so
those stay as a one-line scope stub until their turn comes.

Reordered 2026-08-10: all publishable libraries now come before the
Financial/crypto dashboard, so the dashboard can consume them (auth,
data-grid, form-builder, pdf-generator) instead of standing alone.

1. **Data Grid** (`libs/data-grid`): Freemium (core here, Pro in a
   separate private repo). **DONE, published on npm as `@zhunam/data-grid@1.1.0`**
2. **Dynamic Form Builder** (`libs/form-builder`): Freemium + SaaS (paid
   persistence). **DONE, published on npm as `@zhunam/form-builder@1.1.0`**
3. **Modular auth system** (`libs/auth`, thin wrapper/starter around
   Firebase/Supabase Auth): 100% free. **DONE, published on npm as
   `@zhunam/auth@1.0.0`**
4. **Client-side document (PDF) generator** (`libs/pdf-generator`):
   mostly free, possible template sales (Gumroad). Not started
5. **Real-time chat / notifications** (`libs/chat-widget`, embeddable
   Web Component): pure SaaS, main candidate for real revenue. Not started
6. **Calendar with Google Calendar integration** (`libs/calendar`):
   freemium UI + SaaS sync. Not started
7. **Financial/crypto dashboard** (`apps/`, portfolio piece, not a
   publishable lib): 100% free, not monetizable as a product. Meant to
   showcase auth, data-grid, form-builder, and pdf-generator working
   together in a real use case. Not started


## Future ideas (not yet phased)

Anything beyond the 7 above goes here first, unordered, until it's
promoted into the numbered sequence above.

- **i18n / customizable text in libs/***: varias librerías tienen
  strings hardcodeados en un idioma fijo (ej. paginación en español en
  data-grid, botón "Submit" en inglés en form-builder). Evaluar un
  patrón consistente de customización de texto (inputs opcionales para
  labels de UI, o soporte de i18n real) antes de que la lista de
  librerías crezca más y el problema se replique. Detectado en
  libs/data-grid/ROADMAP.md durante el desarrollo de form-builder.

## Lecciones de infraestructura

- **Vitest no aísla specs que mockean el mismo SDK externo** (`test.isolate`
  default `false` en `@nx/angular:unit-test`): causa real de una falla en
  CI (Linux) en `form-builder` el 2026-08-16. Varios specs llamando
  `vi.mock()`/`vi.hoisted()` sobre el mismo módulo externo compartían un
  registro de módulos, y solo el mock de un archivo tomaba efecto.
  Resuelto agregando un `vitest.config.ts` propio por librería con
  `test: { isolate: true }` (ver `libs/auth/vitest.config.ts`,
  `libs/pdf-generator/vitest.config.ts`). Aplicado proactivamente en
  `pdf-generator` desde el primer spec, sin esperar a que se repita.

- **Vitest no encuentra el runner en Windows nativo (Nx +
  `@nx/angular:unit-test`)**: confirmado que no es un problema de versión
  de Node (falla igual con Node 22.23.2 en Windows, la misma versión
  exacta que corre bien en WSL), ni de config del repo. Es específico de
  cómo el executor de Nx bootstrapea el proceso worker de Vitest en
  Windows. Mientras no se investigue más a fondo (o se resuelva upstream
  en `@nx/angular`), WSL es el entorno de verificación de tests local,
  igual que CI. Cualquier `nx test` corrido nativo en Windows no es
  confiable como resultado, ni positivo ni negativo.

## Recurring maintenance notes

- Review each library's `peerDependencies` whenever Angular releases a
  major version (May / November).
- Review whether any API used in `libs/*` stopped meeting the "stable for
  2+ versions" rule.
