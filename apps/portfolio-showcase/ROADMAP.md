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
- [x] `components/market-state`: selector de moneda con `<select>`
      nativo (evaluado explícitamente contra `lib-form-builder` y
      descartado: un solo campo sin validación no justifica la
      librería), estado independiente del selector de
      `currency-converter`. `totalMarketCap`/`totalVolume` derivados
      con `computed()` leyendo la clave de moneda correcta del MISMO
      `GlobalMarketStats` ya cacheado (cambiar de moneda nunca dispara
      una llamada nueva, confirmado con test explícito). Cambio 24h de
      cap/volumen mostrado siempre en USD con esa etiqueta explícita,
      pese al selector (coloreado vía `priceDirection()` ya existente).
      **Gap real encontrado y corregido**: `volume_change_percentage_
      24h_usd` ya estaba investigado y documentado en este ROADMAP,
      pero nunca se había agregado a `GlobalMarketStats`/
      `CoinGeckoService.getGlobalStats()` cuando se escribió
      originalmente; se agregó ahora (`RawGlobalResponse` y el mapeo).
      No se creó ningún método "compartido" nuevo para la lista de
      `vs_currencies`: el caché de 45s ya existente en
      `CoinGeckoService` (por endpoint, sin params en este caso)
      deduplica automáticamente la llamada entre `currency-converter` y
      `market-state`, sin necesidad de coordinación adicional.
- [x] Reemplazar `REPLACE_WITH_REAL_COINGECKO_DEMO_API_KEY` en
      `environments/environment.ts`/`environment.production.ts` por
      la clave real (el usuario la pega directamente, nunca generada
      ni vista por el agente en el reporte). **Verificado**: mismo
      valor confirmado en ambos archivos (comparación por hash, nunca
      impreso), `fileReplacements` de `project.json` sigue apuntando
      correctamente a los dos, `nx build --configuration=production`
      exitoso, y el placeholder confirmado ausente del bundle
      compilado. Conectividad real confirmada (`HTTP 200` contra
      `/simple/price` y `/ping` con la clave real, vía `curl`, sin
      imprimir su valor). Nota real: el tier Demo/público de CoinGecko
      no rechaza claves inválidas en estos endpoints (un valor
      inventado también da 200), así que esto confirma alcance/formato
      correcto, no una validación criptográfica de la clave en sí. Los
      2 tests de integración de `coingecko.spec.ts` (`skipIf`) siguen
      saltándose en WSL: buscan un `.env` separado (variable de
      entorno), no `environment.ts`, y ese archivo no existe en el
      checkout nativo de WSL — mecanismo distinto, no relacionado con
      este reemplazo.
- [x] Entrada real en home + página del dashboard: no sigue el patrón
      "Library Explorer"/"Package Identifier Label" (no es una
      librería). Nueva sección **"Featured Project"** documentada en
      `DESIGN.md` antes de construirla (tarjeta única, más grande que
      las de Library Explorer, badge `Live` activado por primera vez
      de forma honesta ya que esta pieza sí consume datos en vivo).
      Ruta `/crypto-dashboard` (lazy, mismo patrón que `/calendar`),
      página propia con encabezado simple (sin mono/package label) y
      ensamblando ÚNICAMENTE componentes ya cerrados: `market-ticker`
      (recién conectado por primera vez, ver nota de ese ítem más
      arriba), `market-state`, `trending-carousel`, `market-table`,
      `price-ticker` (reusa el primer coin de la lista de
      `market-table` en vez de una llamada redundante), y
      `currency-converter`. Cero lógica nueva en ningún componente.
      **Hallazgo real durante la verificación manual, diagnóstico
      confirmado con evidencia de timing real** (ver ítem separado más
      abajo, "Diagnóstico de rate limiting en carga inicial — CERRADO,
      cola confirmada correcta"): con datos reales, en carga inicial la
      página dispara ~6-8 llamadas reales independientes a CoinGecko
      (una o más por componente/sección autocontenida). Confirmado con
      Playwright real (`localhost:4200`, el puerto real de `nx serve`)
      que los datos reales SÍ cargan y se ven correctamente cuando la
      API responde (precios BTC/ETH/etc. reales en el marquee, stats de
      `/global`, lista de monedas). Las fallas intermitentes
      ("Could not load..." con su Retry, cada sección ya lo maneja bien
      vía `coin-spinner`, degradación controlada, no un crash) fueron
      agotamiento real de cuota por mis propias pruebas repetidas
      contra la misma clave esta sesión, NO un bug de la cola de
      `CoinGeckoService` — confirmado, no solo la explicación más
      probable.
- [x] Rediseño visual de `/crypto-dashboard` (solo layout/estilos de la
      página contenedora y del contenedor propio de cada sección, cero
      lógica de componente tocada). Nuevo registro **"Crypto Dashboard
      (page-specific register)"** documentado en `DESIGN.md` ANTES de
      implementarlo (excepción explícita y acotada a esta ruta, mismo
      criterio que el hero de home): paneles con fondo tintado
      `bg-primary/5` (reemplaza Vellum+Hairline solo en esta página),
      `market-ticker` full-bleed real (100% viewport) inmediatamente
      debajo del header, antes de cualquier texto, cancelando solo el
      `py-12` de `<main>` (`-mt-12`, no `-mt-28` como el hero de home,
      ya que esta ruta mantiene el header sólido, nunca transparente).
      Hero propio compacto (`min-h-65` ≈ 260px) con el precio real de
      BTC (`featuredCoin()`, ya disponible en la página, sin llamada
      nueva) como elemento dominante, coloreado con `priceDirection()`
      ya existente; el título del proyecto queda subordinado en tamaño.
      Reordenado: ticker → hero → featured coin (`price-ticker`) →
      stats globales → trending → market (ancho completo) → convertidor
      (ancho completo, ya no comparte fila con nada). `currency-converter`
      resuelto: el problema de legibilidad no era un estilo propio suyo
      sino el ancho de 320px de la columna lateral anterior; al pasar a
      ancho completo los 3 campos de `form-builder` (`Amount`/`From`/
      `To`) se ven con texto normal, sin truncar, confirmado con
      captura real. **Confirmado que ningún loading se juntó en un solo
      bloque**: las capturas reales muestran secciones con datos ya
      cargados conviviendo con `currency-converter` todavía en estado de
      error/retry, prueba directa de que cada sección sigue progresando
      de forma independiente tras el reordenamiento. **Sugerencia de
      percepción de carga, no implementada** (de bajo riesgo pero no
      trivial, requeriría tocar el orden interno de los efectos o
      agregar prioridad a la cola de `CoinGeckoService`): alinear el
      orden real de las llamadas en cola con el orden visual de
      aparición en la página, para que lo que se ve primero cargue
      primero de forma garantizada, no solo incidental al orden en que
      Angular construye el árbol de componentes.
- [x] **Corrección del rediseño visual, basada en mockups aprobados en
      otra conversación — reemplaza la entrada anterior, no convive con
      ella.** Alcance idéntico (solo layout/estilos de la página
      contenedora y de los contenedores visuales de cada sección, cero
      lógica de componente tocada; retrofits pendientes de auto-refresh
      y `price-ticker`+`coin-spinner` sin tocar). Cambios reales sobre
      el registro anterior:
      - **Paneles** (`market-state`, `market-table`, `currency-converter`,
        `trending-carousel`): de tinte `bg-primary/5` a **raised
        surface** (`bg-base-100` blanco, sin borde, `shadow-[0_2px_10px_
        rgba(15,37,42,0.08)]`, `rounded-box`), primer uso de ese patrón
        de Elevación sobre paneles de contenido (antes solo botones/
        Library Explorer). Ghost-Card Refusal verificado: ningún borde
        conviviendo con el shadow.
      - **Hero**: de un panel compacto tintado (`min-h-65`, claro) a un
        hero full-bleed **oscuro** (`bg-base-content`/Ink, `min-h-85` ≈
        340px), con 4 formas borrosas/rotadas (Signal Teal y su variante
        on-dark) y 8 partículas punteadas decorativas (CSS puro, sin
        imagen/SVG ilustrativo, mismo criterio que Background Glow), sin
        badge "Live" (removido a propósito). Reutiliza el mismo
        `featuredCoin()` y su `sparkline` real (sin llamada nueva a la
        API); el path del sparkline se duplicó desde `trending-carousel`
        (mismo cálculo, no extraído a helper compartido, ya que esta
        tarea no permite tocar ese componente). El caso neutral de
        `priceDirection()` se resolvió con `text-slate-300` en vez de
        `text-slate-600` (el que usa el resto del sistema), ya que este
        hero es la única superficie oscura de esta página y el tono
        original no pasa contraste ahí; ver DESIGN.md.
      - **"Featured coin" eliminada como sección aparte**: el hero ahora
        cubre ese rol por sí solo; ya no se repite el precio de la misma
        moneda en dos lugares. `price-ticker.ts`/`.html`/`.spec.ts` no se
        tocaron, simplemente dejaron de importarse/renderizarse en esta
        página.
      - **`currency-converter` restaurado** a columna angosta junto a
        `market-table` (no ancho completo), con sus 3 campos apilados
        verticalmente. Nota real: el archivo tenía `[columns]="3"`
        (grilla de 3 columnas lado a lado), lo cual contradecía la
        premisa de la tarea de que el apilado "ya estaba correcto" en la
        iteración anterior; se verificó contra el archivo real antes de
        asumir, y se quitó ese input (default de la librería es `1`,
        produce el apilado vertical real).
      - **Gap real detectado, sin inventar dato**: el mockup pedía una
        "descripción corta" del coin bajo el precio, pero `CryptoCoin`
        (mapeado de `/coins/markets`) no tiene campo `description`.
        Se usó una línea de copy honesto sobre la página misma ("Real,
        live market data from the CoinGecko public API.") en vez de
        fabricar una descripción por moneda, ver la regla de no
        fabricar hechos en DESIGN.md.
      - `crypto-dashboard.spec.ts` actualizado: se quitó la aserción de
        `app-price-ticker` (sección eliminada) y se agregó una que
        cubre el nombre/símbolo del coin ahora renderizado directo en
        el hero de la página. Sin regresiones nuevas: mismos 6 fallos
        preexistentes de siempre (no relacionados, `ActivatedRoute` en
        otras demo pages), verificado en WSL.
      - Verificado: `nx build portfolio-showcase --configuration=production`
        limpio (sin el warning de `CoinSpinner` no usado tras sacarlo de
        los imports de la página), `nx lint portfolio-showcase` limpio,
        capturas reales de Playwright en desktop (1440×900) y mobile
        (390×844) confirmando hero, formas/partículas, sparkline, raised
        surface, y `currency-converter` apilado junto a `market-table`.
- [x] `nx build portfolio-showcase --configuration=production` y
      `nx lint portfolio-showcase` limpios como cierre.
- [x] **Dos ajustes puntuales sobre el hero, ya cerrado.** Alcance
      acotado a: (1) gap visible entre `market-ticker` y el hero, (2)
      botón Submit de `currency-converter` en azul en vez de Signal
      Teal. Causas reales confirmadas antes de arreglar, no supuestas:
      (1) el breadcrumb vivía en el DOM entre ambos elementos full-bleed,
      espaciado por el `gap-8` del flex padre a ambos lados; el `-mt-12`
      del hero solo cancelaba parte de ese espacio, dejando ~34px de
      hueco y tapando casi todo el breadcrumb debajo del hero (medido
      con bounding boxes reales, no estimado). Fix: ticker + hero
      movidos a su propio wrapper sin gap; breadcrumb reubicado después
      del hero. (2) `form-builder` expone `--fb-primary-color` como
      variable CSS de personalización (mecanismo documentado en
      AGENTS.md, no un hack), con default azul `#3b82f6` fijado en su
      propio `:host`; ninguna página de `portfolio-showcase` la había
      seteado nunca. Fix: `--fb-primary-color: #2c5f5d` en
      `currency-converter.scss`, scoped a ese componente. Verificado con
      `getComputedStyle` real: `rgb(44, 95, 93)` = `#2c5f5d`. Build y
      lint limpios, mismos 6 fallos preexistentes en WSL, gap medido en
      0px con Playwright.
- [x] **Rediseño del sparkline del hero + remoción del breadcrumb en
      esta página únicamente.** Documentado en DESIGN.md antes de
      implementar. El sparkline pasó de ser un bloque acotado en la
      esquina a un fondo ambiental full-bleed (`absolute inset-0`)
      detrás de todo el hero, con dos desvanecidos independientes: uno
      horizontal (SVG `<mask>` interno) que lo oculta del lado del
      texto y lo deja visible del otro lado, y uno vertical (CSS
      `mask-image` externo) que lo desvanece en los bordes superior/
      inferior del hero. **Bug real encontrado y corregido durante la
      verificación visual, no solo "quedó bien":** el trazo se veía
      como una cinta gruesa sólida en vez de una línea fina, porque
      `stroke-width` se escala junto con el viewBox al estirarlo de
      100×32 unidades a ~1440×340px reales con `preserveAspectRatio=
      "none"` (escala no uniforme en X/Y); solucionado con
      `vector-effect="non-scaling-stroke"`, que mantiene el grosor
      constante en píxeles de pantalla sin importar el estiramiento.
      **Decisión de color documentada** (pedida explícitamente, la
      tarea traía una contradicción real entre "línea fija en color
      on-dark" y "debe venir de `priceDirection()`, no fijo"): el
      relleno de área se mantiene en un gradiente Signal Teal neutro
      fijo (textura atmosférica, mismo rol que las formas decorativas
      del hero, nunca un color de estado per la propia regla de scope
      del Price Direction Indicator), pero la línea del trazo sí sigue
      `priceDirection()` (reutiliza `heroChangeColor()`, ya tunead para
      esta superficie oscura). Zona de desvanecido horizontal ajustada
      de 38-68% a 55-85% tras verificar en mobile real que la primera
      dejaba las líneas del gráfico cruzando visualmente detrás del
      precio (legible pero más ajustado de lo deseado); con el ajuste,
      el texto queda completamente libre de líneas en mobile,
      manteniendo un tramo amplio visible en desktop. Formas decoradas
      existentes: opacidad recortada ~20% para convivir con el nuevo
      gráfico más grande, sin cambios de posición/blur/conteo.
      Breadcrumb removido ÚNICAMENTE en esta página (el hero ya
      establece contexto por sí solo); confirmado con Playwright que
      `/data-grid` (y por extensión cualquier otra demo, markup
      duplicado por página, no un componente compartido) conserva el
      suyo sin cambios. `crypto-dashboard.spec.ts` actualizado: el test
      de breadcrumb ahora confirma su AUSENCIA en vez de su presencia.
      Verificado: build y lint limpios, mismos 6 fallos preexistentes
      en WSL (91 passed, sin regresión), capturas reales de Playwright
      en desktop y mobile.
- [x] **Nombres completos en los selectores de moneda destino
      (market-state + currency-converter "To").** `/simple/
      supported_vs_currencies` reconfirmado contra la API real: 63
      códigos exactos (mismo número ya documentado), sin nombres
      asociados. Desglose real, verificado, no de memoria:
      - **12 tickers cripto**: btc, eth, ltc, bch, bnb, eos, xrp, xlm,
        link, dot, yfi, sol. De estos, **10 resuelven** contra el top
        100 por market cap (`getMarkets('usd', 100)`, mismo que ya usa
        `currency-converter` para su "From"); **eos y yfi NO** (cayeron
        fuera del top 100 por cap real hoy) — caso borde real, no
        hipotético, confirmado contra `/coins/markets` antes de asumir
        que las 12 iban a resolver.
      - **51 códigos no-cripto**: 46 fiat ISO 4217 (usd..zar), 2 metales
        preciosos (xag=Silver, xau=Gold), 1 unidad del FMI (xdr=IMF
        Special Drawing Rights), y 2 subunidades de display de Bitcoin
        que NO son coins propias (bits=Bits/µBTC, sats=Satoshi) — tabla
        estática acotada a estos 51 códigos reales exactos, ninguno
        genérico agregado de memoria.
      - **Helper nuevo**: `utils/currency-display-name.ts` (mismo
        patrón que `utils/price-direction.ts`), `currencyDisplayName
        (code, coins)` → "Nombre (CÓDIGO)", cruza primero contra la
        lista de coins recibida, después contra la tabla estática fiat/
        otros, y si ninguna matchea devuelve el código en mayúsculas
        solo (nunca vacío, mismo comportamiento que ya existía). 7 tests
        propios cubriendo cripto/fiat/especiales/fallback/prioridad.
      - **market-state no tenía lista de coins propia** (solo `/global`
        + `/simple/supported_vs_currencies`): se le agregó el mismo
        `getMarkets('usd', 100)` que ya usa `currency-converter`, mismos
        params exactos para compartir la cache de 45s de
        `CoinGeckoService` (mismo criterio ya documentado ahí mismo para
        `getSupportedCurrencies()`) — no es una llamada nueva desde la
        perspectiva de la API real, es la misma llamada que el segundo
        componente en pedirla sirve desde cache. Un fallo en esta
        llamada específica se traga silenciosamente (no rompe
        `errorSignal`): es enriquecimiento cosmético, `currencyDisplayName`
        ya cae al código plano sin ella.
      - Verificado con Playwright real (no solo los tests): ambos
        selectores muestran el formato nuevo en el navegador real,
        idéntico entre los dos componentes, valores/ids enviados a la
        API sin cambios (solo texto mostrado). Build y lint limpios,
        mismos 6 fallos preexistentes en WSL (100 passed, +9 tests
        nuevos, sin regresión).
- [x] **Tarjetas más grandes + gráfico interactivo en
      `trending-carousel`, alcance acotado a este componente
      únicamente.** Tarjeta: `w-48`→`w-72` (192px→288px), gráfico
      `h-8 w-full`→`h-36 w-64` (32px alto→144px, ahora el elemento
      dominante de la tarjeta, no un detalle chico bajo el nombre).
      **Decisión técnica real, no cosmética**: el viewBox del SVG se
      cambió de `100×32` (unidades arbitrarias, estiradas de forma no
      uniforme por `preserveAspectRatio="none"` contra cualquier ancho
      real de tarjeta) a `256×144` — coincide EXACTO con el tamaño real
      renderizado del gráfico (`h-36 w-64`), dando escala 1:1 en ambos
      ejes. Esto evita, de raíz, la misma clase de bug ya encontrado y
      corregido en el sparkline del hero (trazo/formas que se ven
      distorsionadas por escalado no uniforme): acá el problema sería
      peor que un trazo grueso, ya que el marcador circular y el texto
      del tooltip se habrían visto como óvalos/letras achatadas sin
      esta corrección. `vector-effect="non-scaling-stroke"` se agregó
      igual, por robustez, sobre el trazo/marcador/línea guía, tal como
      pedía la tarea explícitamente.
      - **Interactividad** (`pointerdown`/`pointermove` comparten
        handler, `pointerup`/`pointercancel`/`pointerleave` ocultan):
        funciona igual en mouse (hover) y touch (arrastre = pointermove
        durante touch; tap simple = pointerdown solo), sin distinguir
        `pointerType` en el código — la propia semántica nativa de los
        eventos ya cubre ambos casos. `touch-none` en el SVG evita que
        un tap en el gráfico dispare el scroll horizontal nativo del
        carrusel en su lugar.
      - **Hit-testing** (`indexForPointerX`, función pura exportada,
        testeada en aislamiento): usa `getBoundingClientRect()` real del
        SVG, nunca las unidades del viewBox — corrección de índice
        independiente de cualquier escala interna.
      - **Día aproximado** (`approxDayLabel`, función pura exportada):
        el array de 168 puntos no trae timestamp por punto (confirmado
        antes en este mismo ROADMAP); el cálculo cuenta horas hacia
        atrás desde "ahora" asumiendo espaciado horario uniforme, con
        comentario explícito en el código aclarando que es una
        APROXIMACIÓN derivada del orden conocido del array, no un dato
        exacto de la API — mismo criterio de honestidad que el resto
        del proyecto.
      - **Paleta**: marcador en verde/rojo/gris (`priceDirection()`,
        mismos valores hex que ya usa el resto del sitio), tooltip en
        Ink/blanco/`#8ba7a6` (exactamente la combinación ya usada y
        verificada en contraste por el hero), línea guía en slate-300.
        Ninguno de estos colores viene de la imagen de referencia, solo
        la mecánica de interacción.
      - Verificado: build y lint limpios, WSL con los mismos 6 fallos
        preexistentes (114 passed, +14 tests nuevos, sin regresión).
        **Verificación visual real en navegador con Playwright**: la API
        real seguía con cuota agotada por el volumen acumulado de
        pruebas de esta sesión (mismo diagnóstico ya CERRADO más arriba
        en este archivo, confirmado de nuevo con evidencia de red real:
        `net::ERR_FAILED` en `/coins/markets` para trending, no una
        suposición); en vez de esperar indefinidamente o insistir contra
        la misma cuota agotada, se interceptaron las rutas de
        `api.coingecko.com` con `page.route()` para servir datos
        simulados (sparklines de 168 puntos reales en forma, no data
        inventada de negocio) y así verificar el RENDERING/INTERACCIÓN
        real del navegador (layout, geometría del SVG, eventos de
        puntero) sin depender de la disponibilidad de la API en ese
        momento — disclosed explícitamente acá, no presentado como
        verificación contra la API real. Confirmado con geometría real
        medida (`getBoundingClientRect`, no asumida): tarjeta
        288×278px, gráfico exactamente 256×144px (escala 1:1 con el
        viewBox, cero distorsión). Hover real con mouse (`page.mouse.
        move`) mostró marcador + línea guía + tooltip con precio y día
        correctos. Touch verificado con una sesión de puntero real
        sostenida (`page.mouse.down()`/`up()`, mismo handler que touch
        ya que el código no distingue `pointerType`): tooltip visible
        mientras se mantiene, oculto inmediatamente al soltar — un
        intento inicial con `element.dispatchEvent(new PointerEvent(...))`
        sintético (sin sesión de puntero real detrás) falló con
        `setPointerCapture` rechazando un `pointerId` inválido en
        Chromium real, confirmando que el mecanismo de captura de
        puntero del componente exige una sesión de puntero genuina
        (touch real o mouse real), no un bug del componente sino una
        limitación real de cómo se puede simular touch sin backing
        genuino.
- [x] **Footer específico de `/crypto-dashboard`, alcance acotado a esa
      ruta.** El footer NO está duplicado por página como el
      breadcrumb (ver nota en el ROADMAP raíz, junto a la de
      duplicación del shell): es un único elemento global en
      `app.html`. Se agregó `isCryptoDashboard` en `app.ts` (mismo
      patrón `toSignal(router.events...)` que ya usaba `isHome`), y el
      `<footer>` ahora condiciona su contenido según eso.
      - **Investigación real de atribución de CoinGecko, no asumida**:
        sus Términos de la API (sección 4.4,
        https://www.coingecko.com/en/api_terms) exigen mostrar
        textualmente "Powered by CoinGecko" en fuente legible, no menor
        a tamaño 10, y aplica a TODOS los planes, incluido el tier
        Demo/gratuito. Su guía de marca
        (https://brand.coingecko.com/resources/attribution-guide) lista
        "Powered by CoinGecko API" como formato aceptable, enlazando a
        `coingecko.com` o `coingecko.com/en/api/`. Se implementó
        exactamente ese formato (no una paráfrasis como "Data via..."
        que se había escrito primero y se corrigió al confirmar el
        texto real exigido), enlazando a
        `https://www.coingecko.com/en/api/`. El footer de esta página
        ya usa `text-sm` (14px), por encima del mínimo de 10px exigido.
      - **Contenido**: se quitó "MIT License" (no aplica, `apps/*` no
        es una librería publicable); se agregó el disclaimer
        financiero ("Informational only, not financial advice: verify
        any price before making decisions", en inglés por consistencia
        con el resto del copy del sitio, la tarea lo pedía en español
        como instrucción pero el significado se mantuvo); los links de
        GitHub/LinkedIn quedaron con los mismos `href` de siempre, sin
        tocar.
      - Verificado: build y lint limpios. WSL con 5 fallos preexistentes
        (no 6): el nuevo test de `app.spec.ts` necesitaba
        `provideRouter(...)` para poder navegar entre rutas y testear
        el footer condicional, y ese mismo provider arregló como efecto
        secundario el test "should render the header brand link", que
        antes fallaba por falta de `ActivatedRoute` — no se tocó nada
        de ese test para lograrlo, fue consecuencia directa de lo que
        esta tarea ya necesitaba agregar. 119 passed (+5 nuevos). Real
        en navegador: `/crypto-dashboard` muestra el footer nuevo,
        `/data-grid` conserva "MIT License" intacto, confirmado con
        Playwright.

- **Auto-refresh de datos — CERRADO, ambos retrofits pendientes
  resueltos.** Decidido como criterio general para todo el dashboard,
  aplicado primero solo en `market-ticker` (polling propio, `setInterval`
  + `fetchCoins()` directo). Quedaban pendientes dos puntos relacionados,
  cerrados juntos en la misma tarea:

  1. **`price-ticker` eliminado, no retrofiteado.** Investigación previa
     (arquitectura real de datos) confirmó que ya no se usaba en ningún
     lado de `crypto-dashboard`: su función (nombre, precio, cambio 24h,
     sparkline del coin destacado) había sido absorbida por el hero
     durante el rediseño de esta misma sesión, dejándolo huérfano
     (archivo completo, tests propios pasando, pero sin ningún
     `<app-price-ticker>` en el árbol real). Decisión explícita con el
     usuario: eliminar, no dejar código muerto ni retrofitearlo con un
     timer que nadie iba a ver. Carpeta completa borrada
     (`.ts`/`.html`/`.scss`/`.spec.ts`, 8 tests con ella). Confirmado con
     grep en todo el repo: cero imports/referencias rotas; las únicas
     menciones restantes son prosa histórica (comentarios explicando de
     dónde salió una lección de testing, o el origen de la convención
     Price Direction Indicator en DESIGN.md, actualizada para aclarar
     que el componente ya no existe pero la convención sigue viva en
     `market-table`/`trending-carousel`/`market-ticker`/`market-state`/
     el hero). `utils/price-direction.ts` (el helper compartido, no el
     componente) intacto y en uso por los 5 lugares recién listados.
     `CHAT_PROMPT_CRYPTO.md` (raíz, documento histórico del prompt
     original de esta fase) deliberadamente NO tocado: no es
     documentación viva como DESIGN.md/ROADMAP.md, es un registro
     histórico de cómo se planificó la fase, fuera del alcance pedido.

  2. **Auto-refresh de `market-table` + `trending-carousel`, centralizado
     en `crypto-dashboard.ts` (la página), no triplicado por
     componente.** Confirmado en la investigación previa: ninguno de los
     dos inyecta `CoinGeckoService`, ambos son puramente `input()`-driven
     desde la página — agregarles su propio `setInterval` habría
     cambiado ese contrato. En su lugar, un único `setInterval` en el
     constructor de la página (mismo `REFRESH_INTERVAL_MS = 50_000` que
     ya usaba `market-ticker`, duplicado como constante propia, mismo
     criterio de no compartir constantes entre archivos ya aplicado en
     el resto de esta app) re-dispara los mismos
     `marketRetryTrigger`/`trendingRetryTrigger` que ya usaba el botón
     Retry — no un mecanismo nuevo, una extensión de uno existente.
     Limpieza vía `DestroyRef.onDestroy(() => clearInterval(...))`,
     mismo patrón que `market-ticker`. `market-table.ts` y
     `trending-carousel.ts` sin ningún cambio: siguen sin inyectar el
     servicio.

     **Verificado con evidencia real, no solo tests**: en WSL, 3 tests
     nuevos (dispara de nuevo tras `REFRESH_INTERVAL_MS`, limpia el
     intervalo al destruir, no duplica el intervalo si la página se
     destruye y se recrea — mismo patrón de fake timers que
     `market-ticker.spec.ts`, instalados ANTES de `createComponent()`).
     Detalle real encontrado al escribir los tests, no asumido: el mock
     compartido de `getMarkets` en `crypto-dashboard.spec.ts` mezcla
     llamadas de 4 consumidores distintos del mismo servicio en esta
     página (`market-ticker`, `market-state`, `currency-converter`, y la
     página misma, cada uno con su propio parámetro de cantidad) — los
     asserts de auto-refresh filtran por los parámetros específicos de
     la página (`'usd', MARKET_TABLE_SIZE`) en vez de contar llamadas
     crudas del spy compartido. Real en navegador (Playwright,
     interceptando requests reales a `api.coingecko.com`, sin mockear
     nada): `/coins/markets` (per_page=20) a los 2045ms y de nuevo a los
     52050ms; `/search/trending` a los 3550ms y de nuevo a los 53549ms —
     ambos gaps de ~50000ms, exactamente `REFRESH_INTERVAL_MS`, sin
     recargar la página. Build y lint limpios. WSL: 5 fallos
     preexistentes (mismo conteo confirmado en la tarea anterior, cero
     nuevos), 121 tests totales (126 anteriores − 8 de `price-ticker` +
     3 nuevos de auto-refresh = 121, cuenta exacta, no una regresión
     oculta), 114 passed.

- **Diagnóstico de rate limiting en carga inicial — CERRADO, cola
  confirmada correcta, no bug**: al verificar `/crypto-dashboard`
  manualmente, se vieron fallas intermitentes ("Could not load...")
  en algunas secciones. Dos hipótesis a distinguir: (1) ruido de mis
  propias pruebas de `curl` de la sesión, que ya habían consumido
  cuota real antes de probar; (2) un problema real de coordinación en
  la cola de espaciado de `CoinGeckoService` (`MIN_REQUEST_SPACING_MS`
  = 1.5s) al recibir pedidos casi simultáneos desde 6 componentes
  independientes, cada uno con su propia inyección del servicio
  singleton (`providedIn: 'root'`).

  **Confirmado con evidencia real de timing, no suposición**: con
  Playwright, interceptando cada request real saliente hacia
  `api.coingecko.com` (sin ningún `curl` previo en esa misma
  ejecución) y midiendo el timestamp exacto de cada una, las 8
  llamadas reales de una carga completa de la página mostraron gaps
  consecutivos de **1500–1514ms entre cada una, sin excepción** —
  exactamente el `MIN_REQUEST_SPACING_MS` configurado, sin ninguna
  ráfaga ni llamadas simultáneas sin espaciar. Una ejecución limpia
  con esa cuota aún disponible completó las 8 con `HTTP 200` reales.
  **Diagnóstico: opción 1 confirmada, no opción 2.** La cola de
  `CoinGeckoService` coordina correctamente entre múltiples
  componentes que la consumen en paralelo desde inyecciones
  independientes del mismo singleton; no hace falta ningún cambio en
  su lógica. Las fallas intermitentes vistas durante la verificación
  fueron cuota real agotada por el volumen acumulado de mis propias
  pruebas (`curl` + varias corridas de Playwright) contra la misma
  clave en la misma sesión, no algo que un visitante real con cuota
  fresca experimentaría. Sin acción pendiente sobre este punto.

- [x] **Pestañas "Trending" / "Top Movers" en la sección Trending,
      mismo `trending-carousel` reutilizado sin tocarlo.** Origen: el
      usuario notó que `/search/trending` de CoinGecko devuelve lo más
      *buscado* en su sitio (memecoins, novedades virales), no lo más
      importante por capitalización — Bitcoin casi nunca aparece ahí.
      Documentado en DESIGN.md ANTES de implementar (sección nueva
      "Tabs", bajo Components): reutiliza la forma de pill ya definida
      para Badges (activa = `badge-primary` relleno Signal Teal, ya
      usado para el Live badge; inactiva = `badge-outline`, ya usado
      para Coming Soon) en vez de inventar un control nuevo.
      - **"Top Movers" no dispara ninguna llamada nueva a la API**:
        ordena client-side (`computed()`) el mismo `marketCoins()` que
        la página ya trae para `market-table` (top 20 por market cap),
        por `|cambio 24h|` descendente, recortado a 10. Confirmado real
        en navegador: cambiar de pestaña con datos ya cargados no
        generó ningún request nuevo a `api.coingecko.com`.
      - El retry del carrusel se redirige según la pestaña activa
        (`onTrendingCarouselRetry()`): dispara `getTrending()` en
        "Trending", `getMarkets()` en "Top Movers" — mismos triggers ya
        existentes (`marketRetryTrigger`/`trendingRetryTrigger`), nada
        nuevo.
      - `trending-carousel.ts`/`.html` sin ningún cambio: solo varían
        los inputs `coins`/`error`/`retry` que le pasa la página, el
        componente sigue sin saber qué pestaña existe.
      - Referencia visual de una imagen del usuario usada ÚNICAMENTE
        para la mecánica (dos pills sobre el carrusel, alternan qué
        muestra), no para sus colores (tema oscuro navy, ajeno a este
        sistema) ni su contenido (traía un botón "Buy" que no se
        replicó: la app no tiene funcionalidad de trading, y
        `trending-carousel.spec.ts` ya tenía un test explícito
        prohibiendo cualquier control de compra/venta/trade).
      - Verificado: build y lint limpios. WSL con 5 fallos
        preexistentes (mismo conteo, cero nuevos), 118 passed (+4
        tests nuevos: pestaña por defecto, orden real de "Top Movers"
        con coins de cambio conocido, ruteo del retry según pestaña,
        `aria-pressed` correcto en ambos botones). Real en navegador:
        "Top Movers" con datos reales en vivo mostró el orden correcto
        (-2.62%, -2.11%, -1.81%, -0.65%, descendente por valor
        absoluto); "Trending" verificado con datos simulados vía
        interceptación de rutas, ya que la API real seguía con cuota
        agotada por el volumen acumulado de pruebas de esta sesión
        (mismo diagnóstico ya cerrado más arriba en este archivo).
