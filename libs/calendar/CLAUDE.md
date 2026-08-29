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
  similar en el futuro de esta librería debería usar `#campo`, no
  `private campo`, si la intención es que sea realmente inaccesible
  desde afuera y no solo "no tipado como público".

## `/google`: Calendar API v3 REST, lectura (`listEvents()`, confirmado empíricamente)

Hallazgos confirmados contra developers.google.com/calendar/api/v3/reference
(`events.list`, recurso `Event`) y developers.google.com/calendar/api/guides/errors,
no contra memoria ni tutoriales:

- `GET https://www.googleapis.com/calendar/v3/calendars/primary/events`,
  con `timeMin`/`timeMax` como RFC3339. **`timeMin`/`timeMax` no son
  "start/end del rango" de forma ingenua**: `timeMin` es el límite
  inferior EXCLUSIVO para el `end` de un evento, `timeMax` el límite
  superior EXCLUSIVO para el `start` de un evento (texto real de
  Google). Pasando `range.start`/`range.end` directo como `timeMin`/
  `timeMax`, esto termina siendo exactamente el mismo test de
  solapamiento de intervalo semi-abierto que ya usa `rangesOverlap()`
  en `CalendarStore`, solo nombrado desde el ángulo opuesto (qué campo
  del evento acota cada parámetro, no "los dos rangos se solapan"). No
  hizo falta ningún ajuste especial en los valores, solo entender que
  la lectura ingenua del nombre ("ambos dentro del rango") habría sido
  incorrecta.
- `singleEvents` se deja en su default real (`false`), nunca `true`: un
  evento recurrente vuelve como un solo recurso con su array
  `recurrence`, no ya expandido en instancias. Es justo lo que
  `mapGoogleEvent()` necesita para delegarle la expansión real a
  `CalendarStore`/`rrule` después.
- La respuesta es un sobre paginado (`{ kind, items: [...],
  nextPageToken?, nextSyncToken? }`), nunca un array plano. `nextPageToken`
  **no se sigue en v1**: `listEvents()` solo trae la primera página.
  Limitación real no pedida explícitamente en la tarea que la
  introdujo, documentada acá en vez de dejarla en silencio; un
  calendario con muchos eventos en el rango consultado puede devolver
  menos de los reales.
- `Event.start`/`Event.end`: `{ date }` (evento de día completo,
  `"yyyy-mm-dd"`) o `{ dateTime }` (evento con hora, RFC3339 con
  offset). **Trampa real de `Date` de JS, confirmada corriendo Node
  directo**: `new Date('2026-09-01')` (solo fecha) parsea como
  medianoche UTC, pero `new Date('2026-09-01T00:00:00')` (fecha + hora
  sin offset) parsea como medianoche LOCAL. Construir la fecha de un
  evento de día completo agregándole `"T00:00:00"` a mano habría
  corrido el día según el huso horario del runtime; `mapGoogleEvent()`
  usa el string `date` tal cual, sin agregarle nada.
- `Event.recurrence` es `string[]`, cada línea con su propio prefijo
  RFC5545 completo (`"RRULE:..."`, `"EXDATE:..."`, etc.), no solo el
  valor sin prefijo. `mapGoogleEvent()` toma la primera línea que
  empieza con `"RRULE:"` y descarta el resto (otro RRULE, EXRULE,
  RDATE, EXDATE); un evento con múltiples reglas o excepciones editado
  directo en Google Calendar no se representa con fidelidad completa
  en v1.
- Error real: `{ error: { errors: [...], code, message } }`. Un 401
  responde con `errors[0].reason: "authError"`, `message: "Invalid
  Credentials"` (ejemplo real de la documentación), confirmando que el
  significado de un 401 acá es específicamente "token expirado o
  inválido", no un error genérico de autorización.
- **Desvío del path pedido, señalado explícitamente**: la tarea que
  pidió `GoogleApiError` decía `libs/calendar/src/lib/google/
  google-api-error.ts` (dentro de `src/lib/` del núcleo). Interpreté
  esto como una probable errata: un archivo específico de `/google`
  viviendo físicamente dentro del árbol de `src/lib/` del núcleo, pero
  exportado únicamente desde el barrel de `/google`, sería una mezcla
  rara sin precedente en `/firebase`/`/supabase` de auth (que nunca
  alcanzan hacia el `src/lib/` del núcleo). Terminó en
  `google/src/lib/google-api-error.ts`, junto al resto de `/google`, y
  la aclaración "no desde el core" la entendí como una advertencia
  para no agregarlo por error al barrel de `src/index.ts`.
- **`GoogleCalendarNotConnectedError`, tipo nuevo, no reutilicé
  `CalendarValidationError`**: el precondition-check de `listEvents()`
  (llamado antes de `connect()`) no es un dato de `CalendarEvent`
  inválido (lo que `CalendarValidationError` documenta explícitamente
  que representa), ni una respuesta HTTP fallida (lo que representa
  `GoogleApiError`, que además nunca llega a dispararse acá, no hay
  fetch todavía). Reusar cualquiera de los dos habría hecho que un
  consumidor atrapando ese tipo también atrape errores de una
  categoría distinta sin quererlo.

## `/google`: Calendar API v3 REST, escritura (`createEvent`/`updateEvent`/`deleteEvent`, confirmado empíricamente)

Hallazgos confirmados contra developers.google.com/calendar/api/v3/reference
(`events.insert`, `events.patch`, `events.delete`) y
developers.google.com/calendar/api/guides/errors:

- **`PATCH` existe y sí soporta actualización parcial real**: "The field
  values you specify replace the existing values. Fields that you don't
  specify in the request remain unchanged" (texto real de Google).
  `updateEvent()` lo usa, mandando solo los campos que cambiaron.
- **Diferencia real con lo que este prompt asumía**: Google recomienda
  explícitamente `get` + `update` (`PUT` completo) en vez de `patch`,
  por costo de cuota: *"each patch request consumes three quota units;
  prefer using a `get` followed by an `update`"* (texto real, página de
  `events.patch`). Igual se usó `PATCH`, no la recomendación de Google:
  un `PUT` completo exige reenviar TODO el recurso tal cual se recibió,
  incluyendo campos reales de `Event` que `CalendarEvent` no modela en
  absoluto (`attendees`, `location`, `reminders`, `conferenceData`,
  etc.), un riesgo real de pisar/perder datos que `updateEvent()` nunca
  llegó a conocer. `PATCH` solo toca lo que efectivamente se manda. Acá
  la corrección pesó más que el ahorro de cuota; documentado por si en
  el futuro el volumen de uso hace que la cuota sí importe más que este
  riesgo.
- `updateEvent()` solo hace un `GET` adicional (antes del `PATCH`)
  cuando `changes` toca `start`, `end`, o `recurrence`: necesario para
  validar el resultado final fusionado (mismo criterio que
  `CalendarStore.updateEvent()`), ya que este conector no mantiene
  ningún estado local de eventos ya leídos. Si `changes` no toca
  ninguno de esos tres campos, no hay `GET` extra.
- **`DELETE` sobre un evento ya borrado: `410 Gone`, no `404`**,
  confirmado contra la página oficial de errores: *"This error can also
  occur if a request attempts to delete an event that has already been
  deleted"*, con guía explícita *"For already deleted events, no
  further action is necessary."* `deleteEvent()` trata un `410`
  específicamente como éxito silencioso (el estado deseado, "el evento
  no existe", ya es verdad). Un `404` (id que nunca existió, caso
  distinto y también documentado por separado: *"the requested resource
  ... has never existed"*) sí se trata como error real: silenciarlo
  ocultaría un id equivocado pasado por el consumidor.
- **Boundary real entre entry points de una misma librería ng-packagr,
  confirmado con `nx build` real, no leyendo código**: `google/`
  necesitaba la misma validación que ya tiene `CalendarStore.
  assertValidEvent()` en el núcleo (`src/lib/calendar-store.ts`), no
  exportada de ahí. Se probaron dos caminos reales, ambos fallan:
  1. Import relativo directo cruzando hacia el árbol de otro entry
     point (`../../../src/lib/calendar-store` desde dentro de
     `google/`): `Cannot find module`, aun exportando la función.
     ng-packagr compila cada entry point con su propio programa de
     TypeScript acotado a su propio árbol de directorios.
  2. Un alias de `tsconfig.base.json` con forma `@zhunam/calendar/<algo>`
     apuntando a un archivo cualquiera del núcleo (no un entry point
     real): `Entry point @zhunam/calendar/<algo> which is required by
     @zhunam/calendar/google doesn't exist`. ng-packagr trata CUALQUIER
     import con esa forma de subpath como si tuviera que corresponder a
     un entry point secundario real y declarado, no hay forma de un
     alias "privado" con esa forma.

     El único camino que sí funciona es el barrel público real del
     núcleo (`@zhunam/calendar`, es decir `src/index.ts`), que es
     exactamente lo que ya se usa para `CalendarEvent`/
     `CalendarValidationError`. No hay ninguna forma de compartir código
     entre entry points de la misma librería sin exponerlo en ese
     barrel público, o sin convertirlo en un entry point secundario
     propio y real (que también sería público, solo que bajo otro
     subpath). **Decisión**: duplicar una versión mínima de la
     validación en `google/src/lib/internal/assert-valid-event.ts`
     (misma lógica que la del núcleo, sin compartir código) en vez de
     promover `assertValidEvent()` del núcleo a su barrel público
     `src/index.ts` solo para este único caso de uso. Aplica a
     cualquier librería futura de este workspace con múltiples entry
     points que necesite compartir un helper interno (no público) entre
     ellos: no existe tal cosa en ng-packagr, solo "público" o
     "duplicado".

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
