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

Ninguna fase activa por el momento. Fase 4 (Client-side document (PDF)
generator) completada y publicada: `@zhunam/pdf-generator@1.1.0` en
npm, junto con `@zhunam/auth@1.0.0`, `@zhunam/data-grid@1.1.0`, y
`@zhunam/form-builder@1.1.0`.

Chat/notificaciones (antes fase 5) se sacó de la secuencia numerada el
2026-08-27, ver "Future ideas" para el detalle. La siguiente candidata
en la secuencia es Calendar, sesión de definición de scope pendiente
(mismo proceso ya usado para las fases anteriores).

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
   mostly free, possible template sales (Gumroad). **DONE, published on
   npm as `@zhunam/pdf-generator@1.1.0`**
5. **Calendar with Google Calendar integration** (`libs/calendar`):
   freemium UI + SaaS sync. Not started
6. **Financial/crypto dashboard** (`apps/`, portfolio piece, not a
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

- **Extraer el shell de drawer/sidebar de las páginas de demo**: hoy
  triplicado byte a byte entre `data-grid-demo.html`/`.scss`,
  `form-builder-demo.html`/`.scss` y `auth-demo.html`/`.scss` (mismo
  markup del drawer daisyUI, mismo breadcrumb, mismo `@for` de
  "Library Explorer", mismo override de `.drawer-side` en el SCSS).
  Extraerlo a un componente compartido antes de que pdf-generator lo
  copie por cuarta vez y calendar/chat-widget lo hagan crecer más.
  Detectado durante el relevamiento previo a la demo de pdf-generator.

- **`home.ts`/`home.html` no iteran las tarjetas de librería**: cada
  tarjeta (Data Grid, Form Builder, Auth) es una propiedad separada
  (`dataGridLibrary`, `formBuilderLibrary`, `authLibrary`) y un bloque
  de HTML repetido a mano, en vez de un `@for` sobre
  `shared/libraries.ts`, pese a que ese archivo ya existe como catálogo
  real y ya se usa así en el sidebar de cada demo. Detectado durante el
  mismo relevamiento.

- **Chat/notificaciones en tiempo real (`libs/chat-widget`)**: sacado
  de la secuencia numerada el 2026-08-27, tras una sesión de
  investigación de mercado. Conclusión: el hueco "Angular-nativo" que
  motivó la idea no existe de verdad (Stream ya publica
  `stream-chat-angular` oficial), y competir en infraestructura de
  chat hosteada contra jugadores financiados (Stream, Sendbird,
  PubNub, Ably) no es viable para un desarrollador solo, el
  benchmark de ingresos verificados de un dev solo en este espacio es
  prácticamente inexistente. Un cliente Angular gratis (wrapper de
  Firebase/Supabase, mismo patrón que `auth`, sin backend pago)
  seguiría siendo válido como pieza de portfolio si se retoma más
  adelante. No descartado para siempre, solo removido de la secuencia
  activa hasta que haya una razón concreta para retomarlo.

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

- **`nx test portfolio-showcase` falla hoy en 5 de 6 archivos** (confirmado
  en WSL 2026-08-25, no es un problema del entorno): `app.spec.ts`,
  `home.spec.ts`, `data-grid-demo.spec.ts`, `form-builder-demo.spec.ts`, y
  el nuevo `pdf-generator-demo.spec.ts`, todos con
  `NG0201: No provider found for ActivatedRoute`. Causa: cualquier
  componente que usa `RouterLink` (`app.ts`, y cada página de demo vía su
  sidebar/breadcrumb) inyecta `ActivatedRoute` en su constructor, y
  ninguno de estos specs (el boilerplate que deja
  `nx g @nx/angular:component`, nunca editado a mano después) provee
  `provideRouter([])`/`ActivatedRoute` en su `TestBed`. Confirmado que es
  preexistente, no algo introducido al agregar pdf-generator-demo:
  reproducido con `git stash` sobre el estado ya commiteado del branch,
  falla igual sin ninguno de los cambios de esta tarea. `auth-demo.spec.ts`
  es la única que pasa, sin proveer nada especial de router tampoco; no
  investigado por qué ese caso puntual no dispara el mismo error. Pendiente
  de arreglo real (agregar `provideRouter([])` a los `TestBed` afectados),
  fuera del alcance de la tarea que lo detectó.

## Recurring maintenance notes

- Review each library's `peerDependencies` whenever Angular releases a
  major version (May / November).
- Review whether any API used in `libs/*` stopped meeting the "stable for
  2+ versions" rule.
