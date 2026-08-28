# calendar

## Propósito

Librería de calendario para Angular con tres capas independientes,
mismo patrón de entry points que auth:

- Núcleo (`src/`): modelo de eventos + estado reactivo (`CalendarEvent<T>`,
  `CalendarStore`), CERO dependencia de ningún proveedor externo.
  Funciona completo y útil sin conectar nada.
- `/google` (opcional): conector de Google Calendar vía Google Identity
  Services, 100% client-side, sin backend propio (confirmado contra la
  documentación oficial de Google: el flujo de OAuth para apps de
  navegador no requiere client secret ni servidor).
- `/calendar-ui` (opcional): componente de vistas mes/semana/día,
  envuelve `angular-calendar` por dentro, nunca expuesto en la API
  pública (mismo principio que pdfmake en pdf-generator: se puede
  cambiar de motor interno sin romper compatibilidad).

## `/google`: Google Identity Services (OAuth2, confirmado empíricamente)

Hallazgos confirmados contra la documentación oficial de Google
(developers.google.com/identity/oauth2/web/...) y, donde fue posible
sin credenciales reales, contra una carga real del script en un
Chromium real (Playwright, sin Client ID registrado, sin abrir el
popup real). Cualquier tarea futura sobre `google-calendar-connector.ts`
debería partir de esto, no redescubrirlo:

- El flujo correcto para autorización con scopes (no "Sign In With
  Google"/ID token, que es identidad, no autorización de API) es
  `google.accounts.oauth2.initTokenClient({ client_id, scope, callback,
  error_callback })` seguido de `tokenClient.requestAccessToken()`. El
  token llega de forma async al `callback` (`TokenResponse`), nunca
  como retorno síncrono de `requestAccessToken()`.
- El script real (`https://accounts.google.com/gsi/client`) SÍ carga y
  expone `google.accounts.oauth2.{initTokenClient, revoke,
  hasGrantedAllScopes, hasGrantedAnyScope}` como funciones reales,
  confirmado inyectando el script real en un Chromium real vía
  Playwright, sin ningún Client ID registrado (`initTokenClient()` con
  un client_id inventado no rechaza nada de forma síncrona, la
  validación real ocurre recién dentro de `requestAccessToken()`,
  cuando de verdad se habla con los servidores de Google). Esta es la
  única pieza de esta librería, hasta ahora, donde no fue posible una
  verificación completamente real: abrir el popup de consentimiento y
  recibir un token real requiere un Client ID de un proyecto real de
  Google Cloud e interacción real de un usuario, ninguna de las dos
  cosas reproducible en este entorno.
- Google prohíbe explícitamente auto-hostear este script (self-hosting
  "puede causar fallas de integración", según su propia documentación),
  así que nunca se empaqueta con esta librería: `load-gsi-script.ts` lo
  inyecta dinámicamente en `document.head` en runtime, solo cuando
  `connect()` se llama de verdad, no en cada carga de la app que use
  esta librería aunque nunca toque `/google`.
- No existe un paquete npm oficial para el runtime de Google Identity
  Services (a diferencia de `firebase`/`@supabase/supabase-js` en
  `/firebase`/`/supabase`). Existe `@types/google.accounts` en
  DefinitelyTyped (comunidad, no mantenido por Google), pero esta
  librería no lo instala: en su lugar, `google/src/lib/internal/
  google-identity-services.ts` declara a mano solo el subconjunto real
  de la API que `GoogleCalendarConnector` usa, evitando que cada
  consumidor arrastre una dependencia no oficial por un puñado de tipos.
  **Nota de tooling de ng-packagr, no obvia:** ese archivo tiene que ser
  un `.ts` real con `export {}; declare global { ... }`, no un `.d.ts`
  puro sin imports/exports (el estilo ambiental más común). Con `.d.ts`
  puro, el bundler de declaraciones de ng-packagr para el entry point
  secundario fallaba con `Could not resolve "./internal/
  google-identity-services"`, porque tsc nunca emite un `.d.ts` de
  salida espejado para un archivo `.d.ts` de *entrada* (solo lo hace
  para `.ts` reales), y el bundler busca ese archivo de salida que
  nunca existió. Confirmado reproduciendo el error exacto antes de dar
  con esta forma. También hizo falta un override puntual de
  `@typescript-eslint/no-namespace` (`allowDeclarations: true`) acotado
  a ese archivo en `eslint.config.mjs`, porque la excepción por
  defecto de esa regla (`allowDefinitionFiles`) solo cubre archivos
  `.d.ts` reales, no `.ts`.
- **Renovación silenciosa (`prompt: 'none'`): no es lo bastante
  confiable como para prometerla en v1.** Existe (`prompt: 'none'` en
  `TokenClientConfig`, "Don't display any authentication or consent
  screens"), pero la documentación oficial de Google no la describe
  como garantizada, y el error documentado cuando falla
  (`access_denied`, no `interaction_required`, confirmado contra la
  página oficial de manejo de errores) requiere de todas formas volver
  a pedir el token. Más aún, la propia guía de Google recomienda pedir
  un token nuevo "from a user-driven event such as a button press"
  cuando el actual expira, no depender de un flujo silencioso de
  background. `GoogleCalendarConnector` v1 (`connect()`/`disconnect()`)
  no implementa renovación silenciosa por esto; revisar si hay un caso
  de uso concreto antes de agregarla.
- Scope pedido: `https://www.googleapis.com/auth/calendar.events`
  (confirmado contra la referencia oficial de scopes de Calendar,
  "View and edit events on all your calendars"), no el scope completo
  `.../auth/calendar` (que además permite compartir/borrar calendarios
  enteros). Alineado con la guía propia de Google de pedir el scope
  más acotado posible.
- **El token de acceso es un campo `#private` real de ECMAScript
  (`#accessToken`), no `private` de TypeScript.** Se probó primero con
  `private accessToken` y un test de esta misma tarea lo agarró:
  `JSON.stringify(connector)`/`Object.keys(connector)` incluían el
  token real, porque `private` de TypeScript no tiene ningún efecto en
  runtime, el campo sigue siendo una propiedad enumerable común y
  corriente. Con `#accessToken`, ni `JSON.stringify()`, ni
  `Object.keys()`, ni `Reflect.ownKeys()` (la API de reflexión más
  exhaustiva de las tres) revelan el campo. Cualquier dato sensible
  similar en el futuro de esta librería (o de `/google`'s próxima
  mitad CRUD) debería usar `#campo`, no `private campo`, si la
  intención es que sea realmente inaccesible desde afuera y no solo
  "no tipado como público".

## Nota de NgZone (confirmada por analogía, no reproducida en vivo)

auth encontró que los callbacks de Firebase/Supabase corren fuera de
la zona de Angular y hay que envolverlos con `ngZone.run()`
(`firebase-auth.service.ts`). El callback de
`google.accounts.oauth2.initTokenClient()` se invoca desde el propio
script de Google, vía su mecanismo interno de popup/`postMessage`, no a
través de ninguna API de Angular, así que por el mismo razonamiento
arquitectónico no está garantizado que corra dentro del contexto de
ejecución de Angular. **Esto no se pudo reproducir con un intercambio
de token real** (necesita un Client ID real registrado e interacción
real de usuario, ninguna disponible acá), así que `GoogleCalendarConnector`
envuelve el callback en `ngZone.run()` por la misma razón ya validada
en auth, no por una repetición independiente del mismo experimento.
Es seguro hacerlo de todas formas incluso si resultara innecesario:
este workspace corre sin `zone.js` instalado (confirmado, no está en
`package.json`), y `@angular/core` expone `ɵNoopNgZone` con un chequeo
`typeof Zone !== 'undefined'` (confirmado leyendo el paquete instalado)
para el caso sin zona real, así que `ngZone.run()` termina siendo una
llamada directa sin efecto extra, nunca algo que pueda romper algo.

## Independencia

No importa nada de `libs/data-grid`, `libs/form-builder`,
`libs/auth`, ni `libs/pdf-generator`. Standalone, instalable sola.
