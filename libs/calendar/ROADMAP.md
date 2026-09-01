# ROADMAP: calendar

## Scope v1

### Adentro
- `CalendarEvent<T>` genérico (título, start/end o allDay, recurrencia
  vía RRULE con `rrule`, `data: T` para modelar citas/tareas/lo que sea
  sin tipos especiales por caso de uso).
- `CalendarStore`: CRUD reactivo a signals, consultas por rango,
  detección de conflictos. Sin ningún backend, funciona en memoria.
- UI de mes/semana/día (`/calendar-ui`, `angular-calendar` interno).
- Conector `/google`: lectura/escritura contra el Google Calendar del
  usuario autenticado, sin backend propio.

### Afuera de v1 (Future ideas del ROADMAP raíz)
- Sistema de reservas públicas (disponibilidad, cliente anónimo,
  confirmaciones): producto aparte, no una extensión de esta librería.
- Gestión de tareas completa (subtareas, prioridades, kanban): producto
  aparte.
- Recursos/salas/multi-staff.
- Otros proveedores (Outlook, CalDAV genérico): candidatos v1.1+, mismo
  patrón de entry point que `/google`.
- Sincronización en segundo plano sin navegador abierto: Pro, repo
  privado, nunca en este repo (ver AGENTS.md, checklist de librería).

## Contrato de API pública (sujeto a ajuste durante implementación,
verificar cada firma contra rrule/Google Calendar API reales antes de
darla por definitiva, mismo criterio que ya se aplicó en pdf-generator)

```ts
export interface CalendarEvent<T = unknown> {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  recurrence?: string; // RRULE string, RFC 5545
  data?: T;
}

export class CalendarStore {
  readonly events: Signal<CalendarEvent[]>;
  addEvent(event: CalendarEvent): void;
  updateEvent(id: string, changes: Partial<CalendarEvent>): void;
  deleteEvent(id: string): void;
  eventsInRange(start: Date, end: Date): Signal<CalendarEvent[]>;
  findConflicts(event: CalendarEvent): Signal<CalendarEvent[]>;
}
```

## Decisiones de arquitectura

- `angular-calendar` y `rrule` son `dependencies` reales (no peer),
  igual que pdfmake en pdf-generator: detalles internos reemplazables,
  nunca expuestos en la API pública.
- Núcleo sin ninguna dependencia de `@angular/common`/
  `platform-browser` salvo que la implementación real lo requiera,
  confirmar empíricamente, no declarar peerDependencies especulativas.
- Cualquier función que hable con Google Calendar corre client-side,
  sin backend, confirmado contra la documentación oficial de Google.


## Tareas (1-3h cada una, en orden)

- [x] Tipos base (`CalendarEvent<T>`) — solo tipos, sin lógica.
- [x] `CalendarStore`: CRUD reactivo a signals, `eventsInRange`,
      `findConflicts`. Correcciones posteriores: `addEvent()` rechaza
      un `id` duplicado; `addEvent()`/`updateEvent()` validan que
      `start`/`end` sean `Date` reales (no `Invalid Date`, no un valor
      que solo cumple el tipo en compilación) y guardan una copia
      defensiva del evento (clona los `Date`, así una mutación externa
      posterior nunca corrompe el store), ver CHANGELOG.md.
- [x] Integración real de `rrule`: `eventsInRange`/`findConflicts`
      expanden `recurrence` de verdad vía `expandOccurrences()`
      (`.between()` real, nunca `.all()` sin acotar). `addEvent`/
      `updateEvent` validan el string RRULE antes de guardar. Ver
      CHANGELOG.md para el detalle de los casos de borde resueltos
      (ocurrencia que empieza antes del rango pero lo solapa por
      duración, ids compartidos entre ocurrencias). Corrección
      posterior: cada evento recurrente se expande hasta un máximo de
      `MAX_OCCURRENCES_PER_EXPANSION` (1000) ocurrencias por consulta,
      cortado en el propio iterator de `rule.between()`, nunca lanza,
      solo `console.warn()` con el id y el `recurrence` del evento
      afectado.
- [x] Conector `/google`, autenticación: `GoogleCalendarConnector`
      (`isConnected`, `connect(clientId)`, `disconnect()`) sobre Google
      Identity Services real, OAuth client-side sin backend, confirmado
      contra la documentación oficial de Google (ver CLAUDE.md para el
      detalle completo: API real usada, script cargado dinámicamente
      desde el CDN de Google nunca empaquetado, scope
      `calendar.events`, límites reales de renovación silenciosa, el
      hallazgo de tooling de ng-packagr con el `.d.ts` ambiental, y por
      qué el token terminó en un campo `#private` real en vez de
      `private` de TypeScript). Sin renovación silenciosa en esta
      mitad.
- [x] Conector `/google`, lectura: `listEvents(range)` sobre el
      endpoint REST real (`GET .../calendars/primary/events`),
      mapeando cada `Event` real de Google a `CalendarEvent`. Ver
      CLAUDE.md para el detalle completo (semántica real de
      `timeMin`/`timeMax`, trampa de `Date` con eventos de día
      completo, solo la primera línea RRULE de `recurrence`,
      `GoogleApiError`/`GoogleCalendarNotConnectedError` nuevos en
      `/google`). Corrección posterior: sigue `nextPageToken`
      automáticamente hasta `MAX_PAGES_PER_FETCH` (4 páginas × 250
      eventos, `maxResults` real de Google confirmado contra la
      documentación), tope de 1000 eventos por llamada igual de
      generoso que `MAX_OCCURRENCES_PER_EXPANSION` de `CalendarStore`;
      al llegar al tope nunca lanza, solo `console.warn()`.
- [x] Conector `/google`, escritura: `createEvent`, `updateEvent`,
      `deleteEvent` sobre los endpoints REST reales (`POST`/`PATCH`/
      `DELETE`). Ver CLAUDE.md para el detalle completo: `PATCH` real
      (soporta actualización parcial de verdad) usado a propósito en
      vez de la recomendación de cuota de Google (`get`+`update`),
      `updateEvent()` solo hace `GET` extra cuando `changes` toca
      `start`/`end`/`recurrence` para validar el resultado final
      fusionado, `410` en `deleteEvent()` tratado como éxito silencioso
      (`404` no), y el hallazgo de boundary de ng-packagr entre entry
      points de una misma librería (`assertValidEvent()` duplicada en
      `google/`, no compartida con el núcleo, no hay forma de un
      helper interno cruzando entry points sin exponerlo públicamente).
      Conector `/google` completo en su alcance de v1 (autenticación +
      lectura + escritura); queda pendiente solo la verificación manual
      con Google Cloud real (ver más abajo) antes de producción.
- [ ] Conector `/google`, sync incremental: investigar y decidir si
      `syncToken` entra en v1 o se documenta como limitación conocida
      para v1.1 (decisión a tomar con evidencia real de la API, no
      ahora).
- [x] `/calendar-ui`, componente de vistas mes/semana/día: `CalendarBoard`,
      envuelve `angular-calendar` internamente, ningún tipo suyo
      expuesto en la API pública (mismo principio que pdfmake oculto en
      pdf-generator). Ver CLAUDE.md para el detalle completo: forma
      real de `CalendarEvent`/`resizable` (objeto por borde, no
      booleano), `provideCalendar()` a nivel de componente confirmado
      con render real, `date-fns` como dependency nueva (pedido
      permiso antes de instalar), y por qué `visibleRangeChange` no usa
      `endOf*()` de `angular-calendar` (fin inclusivo real, distinto
      del `[start, end)` exclusivo del resto de la librería).
- [x] `NgModule` wrapper del componente de `/calendar-ui`
      (`CalendarBoardModule`), desde esta tarea, no retroactivo (a
      diferencia de data-grid/form-builder).
- [x] Tests de seguridad dedicados: `google-connector-security.spec.ts`,
      suite end-to-end (no unit tests aislados, esos ya existían)
      contra la superficie pública completa de `GoogleCalendarConnector`
      ya con todo el CRUD agregado. Token nunca reflectable desde la
      instancia completa (`JSON.stringify`/`Object.keys`/
      `Reflect.ownKeys`, escaneando TODAS las claves por valor, no un
      nombre de campo asumido), `disconnect()` deja los 4 métodos
      públicos rechazando igual que "nunca conectado" sin llamar a
      `fetch`, scope confirmado exacto end-to-end, y un test explícito
      documentando que el Client ID SÍ puede aparecer en
      `JSON.stringify`/logs (distinción deliberada frente al token, no
      un descuido de la regla anterior). Mismo criterio que la suite
      end-to-end de pdf-generator.
- [x] README.md: instalación, ejemplo <10 líneas por entry point
      (verificado compilando de verdad contra `dist/libs/calendar`, no
      de memoria), tabla de API completa (`CalendarEvent`,
      `CalendarStore`, `GoogleCalendarConnector`, los 3 errores,
      `CalendarBoard`), compatibilidad, límites reales de
      comportamiento (1000 ocurrencias, 1000 eventos por página de
      `listEvents`), licencia. Patrón mixto entre auth (múltiples entry
      points, tabla "Entry points") y pdf-generator (dependencias
      internas bundleadas, no peer, ninguna elección del consumidor),
      calendar no encaja del todo en ninguno de los dos moldes
      individualmente.
- [ ] Demo consuming the library
      → apps/portfolio-showcase/src/app/pages/calendar-demo/
      Mismo shell que las demás demos, entrada real en el sidebar
      (nunca "Coming Soon" residual), per el ítem 7 de AGENTS.md.
- [ ] Verificación manual con Google Cloud real: probar connect()/
      disconnect()/CRUD del conector /google contra un Client ID
      real registrado en Google Cloud Console, con interacción real
      de usuario (popup de consentimiento, token real, revoke()
      real). Igual que con auth, en un proyecto Angular aislado
      fuera de este repo, nunca con credenciales reales dentro del
      repo público. Bloqueante antes de considerar esta librería
      production-ready, no se puede verificar en el entorno
      automatizado de esta sesión.
- [ ] Verify production build
      → nx build calendar --configuration=production
