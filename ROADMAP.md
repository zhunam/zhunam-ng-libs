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

Ninguna fase activa por el momento. Fase 5 (Calendar with Google
Calendar integration) completada y publicada: `@zhunam/calendar@1.0.0`
en npm, junto con `@zhunam/auth@1.0.0`, `@zhunam/data-grid@1.1.0`,
`@zhunam/form-builder@1.1.0`, y `@zhunam/pdf-generator@1.1.0`.

La siguiente y última fase de la secuencia numerada es el dashboard
financiero/cripto (`apps/`, no publicable), sesión de definición de
scope pendiente.

Infraestructura de despliegue agregada 2026-09 (fuera de la secuencia
de fases, aplica a todo el repo): `portfolio-showcase` se despliega
automáticamente a Vercel en cada push a `master`, ver sección
"Despliegue" en README.md.

**Pendiente de publicar**: `@zhunam/data-grid` tiene cambios reales sin
publicar (`ColumnConfig<T>.cellTemplate`/`cellClass`, agregados durante
la fase 6 para que `market-table` pueda mostrar imagen y color por
celda; ver `libs/data-grid/CHANGELOG.md` → `[Unreleased]`). Sigue en
`1.1.0` en npm. No bloquea el desarrollo local (`portfolio-showcase`
importa el código fuente directo vía path mapping, no el paquete
publicado), pero falta bump a `1.2.0` (minor, aditivo) y `npm publish`
antes de que un consumidor externo pueda usar esta capacidad. Plan:
publicar al cerrar la fase 6 completa, no ahora mismo, para no
republicar varias veces por cambios sueltos.

**`@zhunam/form-builder` en la misma situación**: `mode: input<'submit'
| 'live'>('submit')` + `valueChange: output<T>` agregados durante la
fase 6 (necesidad real: `currency-converter` necesitaba valores en
vivo, el contrato submit-only existente no alcanzaba; ver
`libs/form-builder/CHANGELOG.md` → `[Unreleased]`). Sigue en `1.1.0`
en npm, mismo plan: publicar (minor) al cerrar la fase 6 completa.

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
   freemium UI + SaaS sync. **DONE, published on npm as
   `@zhunam/calendar@1.0.0`**
6. **Crypto market dashboard** (`apps/`, portfolio piece, not a
   publishable lib): 100% free, not monetizable as a product. Showcases
   data-grid, form-builder, and pdf-generator together over real,
   live market data (CoinGecko public API, no backend). auth
   deliberately excluded: a login here would gate nothing real, it
   already has its own honest demo. Not started


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

- **El monorepo es zoneless: `fakeAsync`/`tick` de Angular no funcionan
  en ningún test con timers** (`apps/portfolio-showcase` no tiene
  `zone.js` como dependencia en absoluto, confirmado en `package.json`;
  tampoco hay `provideZoneChangeDetection()` en ningún `app.config.ts`).
  Encontrado el 2026-09-12 construyendo `market-ticker`
  (crypto-dashboard): un test con `fakeAsync(() => { ...; tick(...); })`
  falló con `Error: zone-testing.js is needed for the fakeAsync() test
  helper but could not be found`, confirmado en WSL, no un problema de
  configuración de esa librería puntual sino de todo el workspace (sin
  `zone.js` instalado, `fakeAsync`/`tick` no pueden funcionar en ningún
  proyecto del monorepo). Solución: usar los fake timers nativos de
  Vitest (`vi.useFakeTimers()` / `vi.advanceTimersByTimeAsync()`), que
  interceptan `setInterval`/`setTimeout` a nivel del runtime de JS, sin
  depender de zonas de Angular. Detalle importante confirmado
  empíricamente: `vi.useFakeTimers()` debe instalarse **antes** de crear
  el componente/servicio bajo test (`TestBed.createComponent(...)`), no
  después — un `setInterval` ya registrado con timers reales (ej. desde
  el constructor de un componente) queda invisible para los fake timers
  si estos se instalan recién en el cuerpo del test, después de que el
  componente ya se construyó. Aplica a cualquier test futuro de este
  monorepo que necesite simular el paso del tiempo (polling, debounce,
  timeouts), no solo a `market-ticker`.

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

- **`/tmp` de WSL puede llenarse con restos de `npm install` viejos**:
  el `tmpfs` de la instancia WSL usada para verificación es de 2GB:
  encontrado lleno al 100% con ~33 directorios de 64MB sin limpiar de
  instalaciones anteriores (fecha ~22 de agosto), causando
  `ENOSPC: no space left on device` al correr tests. Antes de borrar
  cualquier resto de /tmp, confirmar con `lsof` que ningún proceso
  activo lo tiene abierto. Si un `nx test` en WSL falla con ENOSPC,
  revisar esto primero antes de asumir que es un problema del código
  o del repo.

- **ng-packagr y tipos ambientales en entry points secundarios**: un
  archivo de tipos ambientales (`declare global {...}`) escrito como
  `.d.ts` puro rompe el bundler de declaraciones de ng-packagr para ese
  entry point (`Could not resolve "./archivo"`), porque un `.d.ts` de
  entrada nunca tiene un `.d.ts` de salida espejado. Solución: el
  archivo debe ser un `.ts` real con `export {}` + `declare global
  {...}`, nunca un `.d.ts` puro. Encontrado en el conector /google de
  calendar, aplica a cualquier librería futura con entry points
  secundarios que necesiten tipos ambientales (ej. tipos de un script
  externo cargado en runtime).

- **daisyUI v5 sigue aplicando su propio tema segun
  `prefers-color-scheme` del sistema si `<html>` no tiene `data-theme`
  explícito**, incluso con `default: true` configurado en el tema
  propio del proyecto. Un visitante con modo oscuro activo veía el
  tema genérico azul/violeta de daisyUI en vez de la paleta real, en
  cualquier navegador (confirmado en Chromium, Firefox, y WebKit por
  igual, no es un problema de compatibilidad entre motores).
  Encontrado en `apps/portfolio-showcase` el 2026-09-10, vía una
  captura real en Firefox que no coincidía con lo visto en Chrome.
  Solución: `data-theme="<nombre-del-tema>"` explícito en el `<html>`
  de `index.html`, confirmando que sobrevive el paso de inlineado de
  CSS crítico del build de producción (Beasties en este proyecto).

- **El Router de Angular no vuelve el scroll a 0 al cambiar de ruta
  por defecto**: sin `withInMemoryScrolling({ scrollPositionRestoration:
  'top' })` en `provideRouter()`, una SPA hereda la posición de scroll
  de la ruta anterior. Encontrado en `apps/portfolio-showcase` el
  2026-09-10. Aplica a cualquier app Angular nueva con múltiples
  rutas, agregar esta configuración desde el principio.

## Recurring maintenance notes

- Review each library's `peerDependencies` whenever Angular releases a
  major version (May / November).
- Review whether any API used in `libs/*` stopped meeting the "stable for
  2+ versions" rule.
