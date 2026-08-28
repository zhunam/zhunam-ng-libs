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

- [ ] Tipos base (`CalendarEvent<T>`) — solo tipos, sin lógica.
- [ ] `CalendarStore`: CRUD reactivo a signals, `eventsInRange`,
      `findConflicts`. Recurrencia tratada como ocurrencia única por
      ahora (limitación temporal documentada, se resuelve en la
      siguiente tarea).
- [ ] Integración real de `rrule`: expandir `recurrence` de verdad en
      `eventsInRange`/`findConflicts`, reemplazando el placeholder de
      la tarea anterior. Verificar contra la API real de `rrule`
      (`RRule.between()`), no asumir la firma de memoria.
- [ ] Conector `/google`, autenticación: Google Identity Services,
      OAuth client-side sin backend (confirmado en la sesión de scope,
      re-verificar empíricamente al implementar). Token nunca como
      propiedad pasiva. Scopes mínimos por defecto. Confirmar
      empíricamente si los callbacks corren fuera de NgZone (ya
      anotado como sospecha en CLAUDE.md).
- [ ] Conector `/google`, CRUD: mapear `CalendarEvent` ↔ formato real
      de eventos de Google Calendar API (`listEvents`, `createEvent`,
      `updateEvent`, `deleteEvent`).
- [ ] Conector `/google`, sync incremental: investigar y decidir si
      `syncToken` entra en v1 o se documenta como limitación conocida
      para v1.1 (decisión a tomar con evidencia real de la API, no
      ahora).
- [ ] `/calendar-ui`, componente de vistas mes/semana/día: envuelve
      `angular-calendar` internamente, nunca expone sus tipos en la
      API pública (mismo principio que pdfmake oculto en
      pdf-generator).
- [ ] `NgModule` wrapper del componente de `/calendar-ui`, desde esta
      tarea, no retroactivo (a diferencia de data-grid/form-builder).
- [ ] Tests de seguridad dedicados: token de OAuth nunca legible como
      propiedad pasiva, scopes mínimos, cualquier otro hallazgo de
      seguridad real que surja durante la implementación del conector
      `/google` (mismo criterio que la suite end-to-end de
      pdf-generator).
- [ ] README.md (instalación, ejemplo <10 líneas por entry point,
      tabla de API, compatibilidad Angular, licencia, siguiendo el
      mismo patrón ya confirmado en data-grid/form-builder/auth).
- [ ] Demo consuming the library
      → apps/portfolio-showcase/src/app/pages/calendar-demo/
      Mismo shell que las demás demos, entrada real en el sidebar
      (nunca "Coming Soon" residual), per el ítem 7 de AGENTS.md.
- [ ] Verify production build
      → nx build calendar --configuration=production
