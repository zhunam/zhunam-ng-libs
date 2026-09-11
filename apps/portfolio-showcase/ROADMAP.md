# ROADMAP: crypto-dashboard (apps/portfolio-showcase)

Fase 6 de la secuencia numerada del ROADMAP.md raíz. Portfolio piece,
no una librería publicable: vive en `apps/portfolio-showcase`, no en
`libs/*`.

## Scope

### Adentro

- Dashboard de mercado cripto en vivo, sobre datos reales de CoinGecko
  (tier Demo, público, sin backend propio).
- Reutiliza `libs/data-grid`, `libs/form-builder`, y `libs/pdf-generator`
  sobre datos reales, no mock data, para mostrarlas trabajando juntas
  en un caso de uso real (mismo objetivo que cualquier otra demo de
  este repo, pero compuesto en vez de aislado).
- `libs/auth` deliberadamente excluido: un login acá no protegería
  nada real (los datos son públicos), sería un gate falso solo para
  mostrar la librería, y `auth` ya tiene su propia demo honesta.

### Afuera de v1

- Trading real, wallets, cualquier operación que mueva dinero: fuera
  de alcance por completo, esto es un dashboard de lectura.
- Alertas de precio / notificaciones: requeriría persistencia
  (backend), que este piece no tiene por diseño. Candidato a
  "Future ideas" del ROADMAP raíz si se retoma.
- Websockets/precio en tiempo real subsegundo: el tier Demo de
  CoinGecko es REST, no expone un stream; refrescar por polling
  espaciado alcanza para el objetivo de portfolio.

## Decisiones de arquitectura (confirmadas empíricamente, ver
investigación real antes de escribir código)

- **Autenticación real confirmada**: header `x-cg-demo-api-key`
  (`x_cg_demo_api_key` como query param alternativo, no usado). Base
  URL real del tier Demo: `https://api.coingecko.com/api/v3` (mismo
  dominio público, a diferencia de Pro que usa `pro-api.coingecko.com`).
  Confirmado con una llamada real vía `fetch()` desde un origen real
  (`http://localhost:4300`), no solo `curl`: CORS permite el header
  custom sin romper el preflight.
- **La clave Demo va commiteada en `environments/environment.ts` y
  `environment.production.ts`, con el mismo valor en ambos.** Es un
  identificador público de tier gratuito, no un secreto de pago,
  mismo criterio ya aplicado al Client ID de OAuth de Google en
  `libs/calendar` (ver su README: "a public OAuth Client ID, not a
  secret"). Trade-off real, no bloqueante: al estar commiteada,
  cualquiera puede copiarla y consumir la cuota gratuita compartida.
  Mitigación si pasa: rotar la clave en el dashboard de CoinGecko, no
  es un incidente de seguridad.
- **Límite real de historial: 365 días, no 2 años.** La documentación
  de CoinGecko dice "restricted to the past 2 years", pero el error
  real del servidor (`error_code: 10012`, HTTP 401, probado con
  `days=730`, `731`, y `729`, los tres rechazados por igual) dice
  literalmente *"Public API users are limited to querying historical
  data within the past 365 days"*. Cualquier selector de rango de
  fecha en la UI debe topear en 365 días, no ofrecer opciones de 1-2
  años que el servidor va a rechazar.
- **Rate limiting real, confirmado, no solo documentado**: varias
  llamadas consecutivas sin espaciar (`ping` + `markets` + 3×
  `market_chart` en la misma corrida) hicieron fallar las siguientes
  con `TypeError: Failed to fetch` (fallo de red genérico del
  navegador, no un JSON de error legible), mientras que las mismas
  llamadas, aisladas con ~3s de pausa entre cada una, funcionaron
  perfecto. El servicio base (`services/`) tiene que espaciar/cachear
  llamadas, no asumir que se pueden disparar todas en paralelo al
  cargar el dashboard.
- **`sparkline_in_7d.price`**: array de 168 números (7 días × 24h,
  granularidad horaria), sin timestamps propios. Orden confirmado
  empíricamente (no asumido): el primer valor coincide exactamente
  con el primer punto `[timestamp, price]` de
  `market_chart?days=7` para el mismo coin, así que el array va de
  más antiguo a más reciente.
- **`vs_currency` soportadas**: confirmado contra
  `/simple/supported_vs_currencies` real, 63 valores, incluye fiat y
  también tickers cripto (btc, eth, etc. como moneda de cotización,
  no solo fiat). Lista completa a re-confirmar en el momento de
  construir el conversor, no hardcodear la muestra de este documento.
- **Sin backend**: cualquier necesidad futura de esconder la clave
  detrás de un proxy (como recomienda la propia documentación de
  CoinGecko para el tier Pro) queda fuera de alcance mientras este
  piece no tenga backend. Si eso cambia, revisar esta decisión.
- **Pendiente de investigar, no cubierto todavía**: el endpoint
  `/global` (estado general del mercado, candidato real para
  `components/market-state/`) y `/search/trending` (candidato para
  `components/trending-carousel/`, a confirmar si es la fuente real
  de ese componente o si termina siendo más bien un carrusel de
  `sparkline_in_7d` por coin) no se investigaron todavía contra la
  API real. No asumir su forma antes de esa investigación.

## Tareas (1-3h cada una, en orden)

- [ ] **Investigación complementaria de API**: `/global` y
      `/search/trending` contra la API real con la clave Demo, mismo
      criterio que la investigación ya hecha (evidencia real, no
      documentación de memoria). Necesaria antes de las tareas de
      `market-state`/`trending-carousel` de más abajo.
- [x] Estructura de carpetas (`components/{price-ticker,market-table,
      trending-carousel,currency-converter,market-state}`,
      `services/`, `models/`) y `environments/` con `fileReplacements`
      real en `project.json`, confirmado con build de producción y
      desarrollo real (no solo la config, el bundle compilado).
- [ ] `models/`: tipos para lo ya confirmado contra la API real
      (`CryptoCoin` desde `/coins/markets`, `MarketChartPoint` desde
      `/coins/{id}/market_chart`), ampliar cuando se investiguen
      `/global`/`/search/trending`.
- [ ] `services/`: `CoinGeckoService` base (HTTP real, header
      `x-cg-demo-api-key`, base URL desde `environment.coinGecko`).
      Espaciar/cachear llamadas desde el día uno (ver hallazgo de rate
      limiting arriba), no agregarlo después como parche.
- [ ] `components/price-ticker`: vía `nx g @nx/angular:component`,
      nunca copiado a mano. Campos reales confirmados:
      `current_price`, `price_change_percentage_24h`.
- [ ] `components/market-table`: probablemente envuelve
      `lib-data-grid` sobre el resultado de `/coins/markets`. Columnas
      reales confirmadas: `image`, `name`, `symbol`,
      `market_cap_rank`, `current_price`,
      `price_change_percentage_24h`.
- [ ] `components/trending-carousel`: depende de la investigación
      pendiente de `/search/trending`. Si termina mostrando historial
      por coin, respetar el límite real de 365 días (no 2 años) en
      cualquier selector de rango.
- [ ] `components/currency-converter`: sobre `vs_currency` reales
      (`/simple/supported_vs_currencies`, re-confirmar la lista
      completa en el momento, no la muestra de este documento).
      Candidato real para reusar `lib-form-builder`.
- [ ] `components/market-state`: depende de la investigación pendiente
      de `/global`.
- [ ] Reemplazar `REPLACE_WITH_REAL_COINGECKO_DEMO_API_KEY` en
      `environments/environment.ts`/`environment.production.ts` por
      la clave real (el usuario la pega directamente, nunca generada
      ni vista por el agente en el reporte).
- [ ] Demo real en el sidebar de `apps/portfolio-showcase` (mismo
      shell que las demás páginas, entrada real, nunca "Coming Soon"
      residual), verificación manual de que la interacción funciona
      contra la API real, no solo que compila.
- [ ] `nx build portfolio-showcase --configuration=production` y
      `nx lint portfolio-showcase` limpios como cierre.
