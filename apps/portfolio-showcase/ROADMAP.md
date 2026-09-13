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
- **`GET /global` no tiene una sola moneda por defecto, trae todas a
  la vez.** `total_market_cap` y `total_volume` son objetos con ~60
  claves (una por moneda: `usd`, `eur`, `btc`, `eth`, etc.), no un
  número plano en una moneda fija. Un selector de moneda de
  referencia en `market-state` puede leer la clave correcta del MISMO
  response, sin una llamada adicional por moneda. Excepción real:
  `market_cap_change_percentage_24h_usd` y
  `volume_change_percentage_24h_usd` sí están fijos en USD (el sufijo
  `_usd` lo dice), no hay variante para otras monedas. Campos
  confirmados reales y útiles para una franja de estadísticas
  generales: `active_cryptocurrencies` (21084), `markets` (1496),
  `market_cap_percentage` (dominancia por moneda, ej. `btc: 58.17`,
  `eth: 11.65`, hasta 10 monedas, no limitado a btc/eth),
  `market_cap_change_percentage_24h_usd`,
  `volume_change_percentage_24h_usd`, `updated_at` (unix timestamp).
  Los campos de ICOs (`upcoming_icos`/`ongoing_icos`/`ended_icos`)
  están pero no aportan nada útil hoy, no vale la pena mostrarlos.
- **`GET /search/trending` SÍ trae precio y variación 24h por coin**,
  no hace falta una llamada extra a `/coins/markets` solo para eso:
  cada `coins[].item.data` tiene `price` (número plano) y
  `price_change_percentage_24h` (objeto multi-moneda, igual que
  `/global`). Pero **`sparkline` es una URL a una imagen SVG externa
  ya renderizada por CoinGecko** (`https://data.coingecko.com/coins/
  {id}/sparkline.svg`), no un array de precios como
  `sparkline_in_7d.price` de `/coins/markets`: no sirve para un
  gráfico propio con el estilo de esta app, solo para incrustar la
  imagen tal cual viene. Si `trending-carousel` quiere un mini-gráfico
  propio (no la imagen externa de CoinGecko), sí hace falta una
  llamada complementaria a `/coins/markets?ids=<ids de trending>` para
  traer `sparkline_in_7d.price` real de esos mismos coins. `market_cap`/
  `total_volume` acá vienen como strings ya formateados en USD
  (`"$252,487,520"`, con el símbolo y las comas incluidas), no como
  número crudo en la moneda elegida, otra razón más para esa llamada
  complementaria si el selector de moneda debe aplicar también a
  estos dos campos en el carrusel. Devuelve 15 coins (no se probó si
  `limit`/`per_page` son parámetros reales, no investigado). Además
  de `coins`, el response trae `nfts` (7 ítems) y `categories` (6
  ítems) trending, no usados por ahora pero ahí están si se quiere
  ampliar el carrusel más adelante.

## Tareas (1-3h cada una, en orden)

- [x] **Investigación complementaria de API**: `/global` y
      `/search/trending` contra la API real con la clave Demo, mismo
      criterio que la investigación ya hecha (evidencia real, no
      documentación de memoria). Resultado en "Decisiones de
      arquitectura" arriba: `/global` trae todas las monedas a la vez
      (sin llamada extra por moneda), `/search/trending` trae
      precio+variación 24h por coin pero su `sparkline` es solo una
      imagen externa, no datos reales para un gráfico propio.
- [x] Estructura de carpetas (`components/{price-ticker,market-table,
      trending-carousel,currency-converter,market-state,coin-spinner}`,
      `services/`, `models/`) y `environments/` con `fileReplacements`
      real en `project.json`, confirmado con build de producción y
      desarrollo real (no solo la config, el bundle compilado).
- [x] `models/coin.ts`: `CryptoCoin`, `GlobalMarketStats`, y
      `TrendingCoin`. `TrendingCoin` terminó siendo un alias exacto de
      `CryptoCoin` (`export type TrendingCoin = CryptoCoin`), no un tipo
      con menos campos: el propio `sparkline` de `/search/trending` es
      solo una URL a una imagen SVG (ver "Decisiones de arquitectura"),
      así que `getTrending()` siempre completa un `sparkline: number[]`
      real vía la llamada complementaria a `/coins/markets` antes de
      devolver el resultado. No se agregó `MarketChartPoint`:
      `getMarketChart()` devuelve directo `number[]` (ver abajo), sin
      necesidad de un tipo de punto propio.
- [x] `services/coingecko.ts`: `CoinGeckoService` (`providedIn: 'root'`),
      con caché en memoria (TTL 45s, invalidable con
      `invalidateCache()`) y cola de espaciado (mínimo 1.5s entre
      fetches reales) internos, ningún componente futuro necesita
      preocuparse por ninguno de los dos. Usa `fetch` nativo, no
      `HttpClient`: esta app no tiene `provideHttpClient()` en
      `app.config.ts` (confirmado, no se usa en ningún otro lado),
      agregarlo solo para un service con un único consumidor de red no
      sumaba nada frente a `fetch` + Promises encadenadas, que ya
      resuelven la lógica de caché/cola sin RxJS.
- [x] `components/price-ticker`: vía `nx g @nx/angular:component`, en su
      propia subcarpeta (`components/price-ticker/`). `coin =
      input.required<CryptoCoin>()`, `changeDirection` con `computed()`,
      flash de énfasis con `effect()` (se salta el primer render, se
      resetea vía `(animationend)` en el template, no un `setTimeout` con
      duración duplicada de la del SCSS). Sin chequeo manual de
      `prefers-reduced-motion`: se decidió no duplicar el patrón, ya
      resuelto por la regla global de `styles.css` (mismo criterio que
      `coin-spinner`, ver nota de ese ítem más abajo). Decisión de diseño
      nueva: `DESIGN.md` no tenía un color para cambios positivos/negativos
      (solo teal + rojo como única excepción, para validación). Se agregó
      verde como segunda excepción documentada ("Price Direction
      Indicator"), decisión del usuario, no asumida. **Retrofit
      posterior**: `changeDirection` ahora delega en el helper
      compartido `utils/price-direction.ts` (extraído al construir
      `market-table`, ver ese ítem), manteniendo su propio vocabulario
      público (`'positive'|'negative'|'neutral'`) sin tocar sus tests
      existentes; comportamiento visible sin cambios.
- [x] `components/coin-spinner`: `variant = input<'loading'|'error'>('loading')`,
      `message = input<string>()`, `retry = output<void>()`.
      `prefers-reduced-motion` sin lógica propia, resuelto por la regla
      global de `styles.css`. **Reordenado antes que
      market-table/trending-carousel/currency-converter/market-state**
      (mismo criterio que el reordenamiento ya documentado en
      ROADMAP.md raíz, 2026-08-10: los componentes siguientes lo
      necesitan desde su primera versión, para no escribir un estado
      de carga/error descartable en cada uno y reescribirlo después).
      Consumido por `market-table` desde su primera versión. `price-ticker`
      sigue sin retrofitear (ya existía antes de coin-spinner); pendiente
      como tarea futura separada.
- [x] `components/market-table`: envuelve `lib-data-grid` sobre
      `coins = input.required<CryptoCoin[]>()`. Columnas: `image`
      (imagen vía `cellTemplate`), `name`, `symbol`, `rank`,
      `currentPrice`, `changePercentage24h` (color vía `cellClass` +
      helper compartido `priceDirection()`, ver `utils/price-direction.ts`).
      **Bloqueo real encontrado en investigación**: `ColumnConfig<T>` de
      `@zhunam/data-grid@1.1.0` no soportaba render custom por columna
      (solo `key`/`label`/`sortable`, celdas como texto plano). Se
      extendió la librería (`cellTemplate`/`cellClass`, aditivo, ver
      `libs/data-grid/CHANGELOG.md` y `ROADMAP.md`), decisión del
      usuario tras presentar alternativas. `error = input<string | null>(null)`
      y `retry = output<void>()` muestran/reenvían el estado de
      `coin-spinner` en vez de la tabla.
- [x] `components/trending-carousel`: `coins = input.required<CryptoCoin[]>()`,
      sin llamada a la API propia (el consumidor llama `getTrending()` y
      pasa el resultado, que ya viene con `sparkline` real vía la llamada
      complementaria a `/coins/markets`). Tarjeta: imagen, nombre, símbolo,
      precio, badge de variación coloreado, mini-gráfico de área SVG
      (path calculado directo del array de 168 puntos, sin librería de
      charting), mismo color vía `priceDirection()`. Flechas ← → con
      scroll horizontal, deshabilitadas en cada extremo. `error`/`retry`
      con `coin-spinner`, mismo patrón que `market-table`.
      **Hallazgo real verificado con Playwright** (emulando
      `prefers-reduced-motion: reduce`): un `scrollTo({behavior:'smooth'})`
      explícito en JS anima igual (~18 frames), aunque la regla global de
      `styles.css` fuerce `scroll-behavior: auto` por CSS. A diferencia de
      una animación CSS, el `behavior` explícito de JS no lo respeta
      automáticamente; se agregó un chequeo puntual de `matchMedia` solo
      para el scroll de las flechas (no para animaciones CSS en general,
      que siguen sin necesitar chequeo propio).
- [x] `components/market-ticker`: cinta de marquee CSS continua (no
      controles de usuario, a diferencia de trending-carousel).
      Autocontenido: inyecta `CoinGeckoService` directo y hace su
      propio polling (a diferencia de price-ticker/market-table/
      trending-carousel, que reciben datos vía input de un consumidor).
      `TICKER_COIN_COUNT` calculado para que un set completo de monedas
      sea más ancho que un viewport de 1280px asumido (con un ancho por
      ítem deliberadamente subestimado, ~120px, para redondear hacia
      más monedas en vez de menos), evitando que el set duplicado
      (para el loop sin costura) muestre la misma moneda dos veces en
      pantalla a la vez. Polling cada 50s (leve margen sobre el TTL de
      caché de 45s del service, para no aterrizar justo antes de que
      expire). **No insertado en ningún layout todavía** (decisión del
      usuario: la página real del dashboard aún no existe como tarea;
      insertarlo en `app.html` lo haría global a todo el sitio,
      disparando polling a CoinGecko en páginas no relacionadas).
      **Verificado empíricamente con Playwright** que la regla global
      de `styles.css` SÍ alcanza para esta animación (a diferencia del
      `scrollTo` de trending-carousel): `animation-duration` colapsa a
      0.01ms y el `transform` quedó en `none` durante toda la
      animación bajo `prefers-reduced-motion: reduce`, sin necesidad
      de ningún chequeo de JS.
- [x] `components/currency-converter`: **`lib-form-builder` NO se usó**
      (hallazgo real): su contrato es "llenar formulario → submit →
      `formSubmit`", sin ningún output de valores en vivo antes del
      submit. El requisito de actualización automática con debounce en
      `amount()` no encaja con ese patrón orientado a submit, ni
      parcialmente (ni siquiera solo para el input numérico, ya que el
      debounce es específicamente sobre tecleo en vivo). Se construyó
      con controles nativos (`<input>`, dos `<select>`) + signals,
      estilo Form Fields de `DESIGN.md` (Vellum, Hairline border).
      **`CoinGeckoService` extendido** con `getSimplePrice(coinId,
      vsCurrency)` (`/simple/price`, forma real confirmada contra la
      API pública sin necesidad de la clave real: objeto anidado
      `{ [coinId]: { [vsCurrency]: number } }`), mismo patrón de
      caché/cola que los métodos existentes. `getSupportedCurrencies()`
      ya existía y ya coincidía (63 monedas confirmadas de nuevo contra
      la API real). Lista de "from": reusa `getMarkets()` (top 100 por
      market cap, no las ~17.000 monedas que trackea CoinGecko, "lista
      completa" leído como "mismo método que market-table", no
      exhaustivo). Botón swap: la regla dada solo pedía chequear que el
      symbol de `fromCoin` exista en `vs_currencies`, pero eso solo
      garantiza una dirección; se extendió a chequear TAMBIÉN que
      `toCurrency` mapee a un coin real en la lista (si no, el swap
      "habilitado" no tendría a qué cambiar `fromCoin`, ej. bitcoin→usd
      no habilita el swap ya que "usd" no es ninguna moneda de la
      lista; bitcoin→eth sí, porque "eth" es ethereum).
      **Retrofit posterior**: migrado a `lib-form-builder` en `mode
      'live'` una vez esa capacidad existió (ver ítem de `form-builder`
      en su propio ROADMAP). Los 3 campos nativos se reemplazaron por
      una configuración declarativa (`FieldConfig<ConverterFormValue>`).
      Swap ahora se logra reconstruyendo `fields()` con nuevos
      `defaultValue` (form-builder no expone ningún `setValue` externo;
      esto usa el mismo mecanismo documentado en su propio código para
      "wizard swapping steps"). **Cambio de comportamiento real,
      reportado, no silencioso**: el mensaje de error de `amount`
      (antes visible con cada tecla) ahora solo aparece al hacer blur
      del campo o al enviar, porque `form-builder` (sin modificar en
      esta tarea) solo muestra errores cuando el control está `touched`
      o el form fue `submitted` — comportamiento estándar de Angular
      Reactive Forms, no un bug. La validación en sí (`required` +
      `min: Number.EPSILON` para "mayor a 0" real, ya que
      `Validators.min` es inclusivo) sigue bloqueando la conversión
      igual que antes, solo cambia CUÁNDO se ve el mensaje.
- [ ] `components/market-state`: franja de estadísticas globales del
      mercado (no un estado de carga), sobre `GET /global` ya
      investigado: dominancia BTC/ETH y del resto del top 10,
      capitalización total, cambio 24h, cantidad de criptomonedas
      activas. Ver "Decisiones de arquitectura" para qué campos leer
      directo del mismo response al cambiar de moneda, y cuáles
      quedan fijos en USD.
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

## Notas de diseño pendientes

- **Auto-refresh de datos**: decidido como criterio general para todo
  el dashboard (la app muestra valores que deben verse actualizados
  sin que el visitante recargue la página manualmente), pero aplicado
  primero solo en `market-ticker` (polling propio al método existente
  de `CoinGeckoService`, respetando su TTL de caché de 45s). El
  retrofit de `price-ticker`, `market-table`, y `trending-carousel`
  con el mismo criterio queda pendiente como tarea separada, a definir
  después (no implementado junto con `market-ticker`).
