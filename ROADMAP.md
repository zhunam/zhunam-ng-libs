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
Calendar integration) completada y publicada.

**Versiones reales en npm, confirmadas contra `package.json` de cada
librería el 2026-09-29** (esta lista se desactualiza rápido, siempre
confirmar contra `package.json` real antes de citarla en otro lado, no
copiarla de memoria): `@zhunam/data-grid@4.2.0`,
`@zhunam/form-builder@3.1.0`, `@zhunam/auth@3.0.0`,
`@zhunam/pdf-generator@2.0.0`, `@zhunam/calendar@2.0.0`.

La siguiente y última fase de la secuencia numerada es el dashboard
financiero/cripto (`apps/`, no publicable), sesión de definición de
scope pendiente.

Infraestructura de despliegue agregada 2026-09 (fuera de la secuencia
de fases, aplica a todo el repo): `portfolio-showcase` se despliega
automáticamente a Vercel en cada push a `master`, ver sección
"Despliegue" en README.md.

**Resuelto (histórico, ver `CHANGELOG.md` de cada librería para el
detalle real):** esta sección solía documentar cambios reales sin
publicar en `data-grid` (`cellTemplate`/`cellClass`) y `form-builder`
(`mode`/`valueChange`), ambos agregados durante la fase 6 y publicados
después junto con varias rondas más de cambios (modo servidor, filtro,
selección de filas, y carga/vacío en `data-grid`; switch/segmented,
hints, y solo lectura en `form-builder`). Ambas librerías pasaron por
varios releases mayores y menores desde entonces (ver la lista de
versiones reales arriba); la nota puntual sobre esos dos cambios
específicos ya no aplica, dejada solo como referencia de que esa
situación existió y se resolvió, no como estado actual.

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
   separate private repo). **DONE, published on npm as `@zhunam/data-grid@4.2.0`**
2. **Dynamic Form Builder** (`libs/form-builder`): Freemium + SaaS (paid
   persistence). **DONE, published on npm as `@zhunam/form-builder@3.1.0`**
3. **Modular auth system** (`libs/auth`, thin wrapper/starter around
   Firebase/Supabase Auth): 100% free. **DONE, published on npm as
   `@zhunam/auth@3.0.0`**
4. **Client-side document (PDF) generator** (`libs/pdf-generator`):
   mostly free, possible template sales (Gumroad). **DONE, published on
   npm as `@zhunam/pdf-generator@2.0.0`**
5. **Calendar with Google Calendar integration** (`libs/calendar`):
   freemium UI + SaaS sync. **DONE, published on npm as
   `@zhunam/calendar@2.0.0`**
6. **Crypto market dashboard** (`apps/`, portfolio piece, not a
   publishable lib): 100% free, not monetizable as a product. Showcases
   data-grid, form-builder, and pdf-generator together over real,
   live market data (CoinGecko public API, no backend). auth
   deliberately excluded: a login here would gate nothing real, it
   already has its own honest demo. In progress, most of the page
   already built (see `apps/portfolio-showcase/ROADMAP.md`, the source
   of truth for this phase's detail, not duplicated here): the
   pdf-generator gap named in this scope line specifically — it was
   never actually integrated until late in the process, a real hole
   caught before closing the phase — is now closed, an "Export PDF"
   report button next to the market table.


## Future ideas (not yet phased)

Anything beyond the 7 above goes here first, unordered, until it's
promoted into the numbered sequence above.

- **i18n / customizable text in libs/***: varias librerías tenían
  strings hardcodeados en un idioma fijo (ej. paginación en español en
  data-grid, botón "Submit" en inglés en form-builder). Detectado en
  libs/data-grid/ROADMAP.md durante el desarrollo de form-builder.
  **Resuelto para data-grid, form-builder, y auth/form-ui**: las 3
  exponen ahora un token de mensajes inyectable
  (`DATA_GRID_MESSAGES`/`FORM_BUILDER_MESSAGES`/`AUTH_UI_MESSAGES`, con
  su `provide*Messages()` correspondiente) con presets EN/ES, default
  en inglés, cada mensaje una función evaluada al renderizar. No
  revisado todavía en pdf-generator ni calendar, ninguna afirmación
  sobre esas dos.

  **Aclaración 2026-09-29, tras agregar `hint`/`FieldOption.description`
  a `form-builder`:** esos dos campos son texto que escribe el propio
  consumidor en su `FieldConfig`/`FieldOption` (igual que `label`/
  `placeholder`), no texto genérico de la librería. No pasan por
  `FORM_BUILDER_MESSAGES` ni tienen que traducirse ahí; esta nota de
  i18n sigue aplicando solo al texto que la librería misma decide
  mostrar (validaciones, label del submit, etc.), no a config provista
  por el consumidor.

- **Extraer el shell de drawer/sidebar de las páginas de demo**: hoy
  triplicado byte a byte entre `data-grid-demo.html`/`.scss`,
  `form-builder-demo.html`/`.scss` y `auth-demo.html`/`.scss` (mismo
  markup del drawer daisyUI, mismo breadcrumb, mismo `@for` de
  "Library Explorer", mismo override de `.drawer-side` en el SCSS).
  Extraerlo a un componente compartido antes de que pdf-generator lo
  copie por cuarta vez y calendar/chat-widget lo hagan crecer más.
  Detectado durante el relevamiento previo a la demo de pdf-generator.

- **El `<footer>`, a diferencia del breadcrumb, NO está duplicado por
  página: es un único elemento global en `app.html`** (fuera del
  `<router-outlet>`), verificado antes de tocar nada al armar el
  footer específico de `/crypto-dashboard`. Como consecuencia, mostrar
  contenido distinto ahí según la ruta no se resuelve copiando markup
  (como el breadcrumb), sino con detección de ruta en `App` (`app.ts`):
  se agregó `isCryptoDashboard`, mismo patrón `toSignal(router.events...)`
  que ya usaba `isHome` para el header transparente. Primera vez que el
  footer diverge intencionalmente entre rutas (sin "MIT License" en
  `/crypto-dashboard`, ya que esa pieza es `apps/*` y no una librería
  publicable; con atribución real a CoinGecko y un disclaimer
  financiero en su lugar) — una decisión documentada, no una
  inconsistencia accidental. Cualquier futura página con necesidades de
  footer distintas debería sumarse a este mismo `computed`/`toSignal`,
  no reabrir la pregunta de si el footer está duplicado.

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

- **Regla vigente desde 2026-09-28: probar siempre primero en Windows
  nativo, nunca WSL como paso reflejo.** El hallazgo original de más
  abajo (Vitest sin encontrar el runner en Windows) se había
  convertido, con el tiempo, en una regla general mal aplicada ("cualquier
  `nx test` en Windows no es confiable"), citada de memoria en vez de
  re-verificarse. Re-verificado esa fecha en una sesión de release de
  `data-grid`: `nx test data-grid` corrió limpio en Windows nativo (60/60
  tests), sin el error original, en la misma máquina. La causa exacta de
  por qué el hallazgo original ya no reproduce no se investigó (¿una
  actualización de `@nx/angular`? ¿una reparación de entorno previa de
  otra tarea?), pero el resultado real invalida la regla vieja tal como
  estaba escrita. **Regla nueva:** correr `nx build`/`nx lint`/`nx test`
  en Windows nativo primero, siempre, sin importar lo que diga esta nota
  o un prompt con una etiqueta `[WSL]`. Solo caer a WSL si Windows falla
  de verdad en el momento, con el error real a la vista, nunca como paso
  reflejo. Costo real medido de ir a WSL sin necesidad: un `npm ci`
  completo ahí tarda ~18 minutos en este filesystem montado, contra
  segundos en Windows nativo para el mismo repo, sin contar el problema
  de shims cruzados documentado más abajo.

  **Hallazgo original (2026-08-25), mantenido como historial, ya no
  vigente como regla general:** confirmado en su momento que no era un
  problema de versión de Node (fallaba igual con Node 22.23.2 en
  Windows, la misma versión exacta que corría bien en WSL), ni de
  config del repo, sino específico de cómo el executor de Nx
  bootstrapeaba el proceso worker de Vitest en Windows en ese momento.

- **Vitest no encuentra el runner en Windows nativo (Nx +
  `@nx/angular:unit-test`)**: confirmado que no es un problema de versión
  de Node, ni de config por librería. Inicialmente visto solo en
  `form-builder`; confirmado 2026-10-03 que `auth` falla con el mismo
  mensaje exacto (`Vitest failed to find the runner`,
  `angular:test-bed-init:angular:test-bed-init:12:5`, comparado carácter
  por carácter contra la corrida de form-builder). Ya no se puede asumir
  que las demás librerías corren limpias en Windows nativo por defecto:
  cada librería nueva debe probarse en Windows nativo primero igual, pero
  el fallback a WSL deja de ser sorpresa si aparece. Sigue sin
  investigarse la causa raíz (específica de cómo el executor de Nx
  bootstrapea el worker de Vitest en Windows, no del repo ni de una
  librería puntual). Mientras no se resuelva, WSL sigue siendo el
  entorno de verificación válido cuando Windows nativo falla con este
  error exacto.

- **`nx test portfolio-showcase` falla hoy en 5 de 6 archivos — CERRADO,
  ver fix real más abajo.** Diagnóstico original (confirmado en WSL
  2026-08-25, no un problema del entorno): `app.spec.ts`, `home.spec.ts`,
  `data-grid-demo.spec.ts`, `form-builder-demo.spec.ts`, y el nuevo
  `pdf-generator-demo.spec.ts`, todos con
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

  **Fix real aplicado 2026-09-13.** `provideRouter([])` agregado a los
  `TestBed` de `calendar-demo.spec.ts`, `data-grid-demo.spec.ts`,
  `form-builder-demo.spec.ts`, `pdf-generator-demo.spec.ts`, y al
  primer `describe` de `home.spec.ts` (el segundo `describe` de ese
  archivo ya lo tenía, agregado en una tarea anterior específicamente
  para poder testear la sección Featured Project mientras este bug
  seguía sin resolver). Mismo patrón exacto ya usado en
  `auth-demo.spec.ts`/`crypto-dashboard.spec.ts`: un array vacío
  alcanza, ninguno de estos tests navega a una ruta real.

  **Dos detalles del diagnóstico original que ya no coinciden con el
  estado real del repo, dejados anotados en vez de reescribir la
  nota original**: (1) `app.spec.ts` ya no estaba en la lista de
  fallos al empezar este fix — se corrigió como efecto secundario de
  una tarea anterior (agregar `provideRouter(...)` al `TestBed` de
  `app.spec.ts` para poder testear el footer condicional de
  `/crypto-dashboard` arregló, sin buscarlo, el mismo NG0201 que
  afectaba a ese archivo). (2) `auth-demo.spec.ts`, al releerlo ahora,
  sí tiene `provideRouter([])` en su `TestBed` — contradice la
  afirmación original de que "no provee nada especial"; no se
  investigó cuándo se agregó, pero el archivo real hoy ya sigue el
  patrón correcto.

  Verificado: `nx run-many --target=test --all` en WSL — 6/6 proyectos
  del monorepo en verde, cero regresión. `portfolio-showcase`:
  17/17 archivos, **129 passed, 0 failed** (antes: 124 passed, 5
  failed). Build y lint de `portfolio-showcase` limpios.

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

- **Correr `npm ci` desde WSL sobre un `node_modules` compartido con
  Windows rompe `npx nx` del lado Windows.** Encontrado el 2026-09-28
  agregando el modo servidor a `data-grid`: tras un `npm ci` en WSL
  (necesario porque los binarios nativos de `node_modules` ya estaban
  compilados para Windows y Vitest no arrancaba ahí, ver la nota de
  más arriba sobre Windows nativo), `npx nx` en Windows empezó a
  fallar con `"nx" no se reconoce como un comando interno o externo`.
  Causa: WSL, al reinstalar sobre el mismo `node_modules` montado en
  el filesystem de Windows, genera symlinks POSIX en `node_modules/
  .bin` en vez de los shims `.cmd`/`.ps1` que Windows necesita para
  ejecutar un binario vía `npx`. Un `node_modules` compartido entre
  Windows y WSL no puede tener ambos toolchains funcionando a la vez:
  el que instaló último "gana" y rompe al otro. Solución real usada:
  correr `npm install` nativo en Windows (no en WSL) después de
  terminar la corrida de tests en WSL, lo que regenera los shims
  `.cmd` correctos sin cambiar ninguna versión del lockfile. Advertencia:
  revisar el diff de `package-lock.json` después de este `npm install`
  de reparación, puede aparecer ruido de deduplicación de dependencias
  anidadas (entradas duplicadas de un mismo paquete bajo distintos
  `node_modules/<paquete>/node_modules/<dep>`) sin ningún cambio real
  de versión; si es así, es seguro revertirlo con `git checkout --
  package-lock.json` antes de commitear.

- **Varios tags de release (`<lib>-v<version>`) no son ancestros de
  `master`.** Confirmado 2026-09-29 con `git merge-base --is-ancestor
  <tag> master` sobre todos los tags existentes. No es un patrón limpio
  de "todos los viejos rotos": algunos tags viejos SÍ son ancestros
  válidos. Estado real confirmado ese día:
  - Ancestros válidos: `data-grid-v2.0.0`, `data-grid-v4.0.0`,
    `data-grid-v4.1.0`, `form-builder-v1.2.0`, `form-builder-v3.0.0`,
    `auth-v3.0.0`.
  - NO son ancestros de `master` (rotos): `data-grid-v3.0.0`,
    `form-builder-v2.0.0`, `auth-v2.0.0`, `calendar-v2.0.0`,
    `pdf-generator-v2.0.0`.
  - Sin tag todavía para las dos versiones más recientes publicadas
    esta sesión: `data-grid-v4.2.0` y `form-builder-v3.1.0`.
  No arreglado en esta tarea (fuera de su alcance, es una tarea de solo
  documentación). Cualquier tarea futura que dependa de un tag para
  identificar el commit real de un release debería confirmar con
  `git merge-base --is-ancestor` antes de asumir que el tag apunta a
  donde dice apuntar.

## Recurring maintenance notes

- Review each library's `peerDependencies` whenever Angular releases a
  major version (May / November).
- Review whether any API used in `libs/*` stopped meeting the "stable for
  2+ versions" rule.
