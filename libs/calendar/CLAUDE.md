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

## Seguridad: OAuth de Google (aplica desde el primer componente que lo toque)

- El token de acceso NUNCA es una propiedad pasiva legible en cualquier
  momento, mismo principio que `getIdToken()` en auth: exponerlo solo
  vía métodos explícitos, nunca un signal público de lectura directa.
- Scopes mínimos por defecto (ej. `calendar.events`, no el scope
  completo de la cuenta) salvo que el consumidor pida explícitamente
  algo más amplio.
- El Client ID de OAuth para apps de navegador NO es secreto (como la
  config pública de Firebase), documentar esto con claridad para que
  nadie lo trate como si lo fuera ni intente ocultarlo.
- Verificar empíricamente (no asumir) dónde guarda el token la librería
  de Google Identity Services por defecto, y documentarlo acá una vez
  confirmado.

## Nota proactiva: NgZone

auth encontró que los callbacks de Firebase/Supabase corren fuera de
la zona de Angular y hay que envolverlos con `ngZone.run()`. Google
Identity Services se carga como script global igual que esos SDKs,
así que es altamente probable que tenga el mismo problema. Confirmarlo
como paso explícito al construir el conector `/google`, no asumir que
no aplica acá.

## Independencia

No importa nada de `libs/data-grid`, `libs/form-builder`,
`libs/auth`, ni `libs/pdf-generator`. Standalone, instalable sola.
