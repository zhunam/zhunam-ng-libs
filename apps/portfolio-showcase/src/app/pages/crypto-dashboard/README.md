# Crypto Market Dashboard

Nota técnica de orientación para quien lea el código de esta carpeta.
No es un README de librería: esta pieza vive en `apps/portfolio-showcase`,
no se publica, y no tiene una API pública de consumo (sin instalación,
sin tabla de Inputs/Outputs).

## Qué es

Una pieza de portfolio que demuestra `@zhunam/data-grid`,
`@zhunam/form-builder`, y `@zhunam/pdf-generator` trabajando juntas
sobre datos de mercado reales y en vivo, no datos de muestra estáticos.

## Fuente de datos

API pública de CoinGecko (tier Demo), sin backend propio. La clave del
tier Demo va commiteada en `environments/environment.ts` y
`environment.production.ts`: es un identificador público de tier
gratuito, no un secreto de pago, mismo criterio ya aplicado al OAuth
Client ID de `libs/calendar` (ver su README: "a public OAuth Client ID,
not a secret"). Detalle completo del trade-off en el
[ROADMAP.md](../../../../ROADMAP.md) de esta app.

## Arquitectura, en breve

- **`CoinGeckoService`** (`services/`): capa única de acceso a la API,
  con caché en memoria (45s) y una cola que espacia las requests
  (1.5s), para no pisar el rate limit del tier Demo con múltiples
  componentes pidiendo datos a la vez.
- **`market-table`** usa `ColumnConfig<T>.cellTemplate`/`cellClass` de
  `@zhunam/data-grid` (v2.0.0) para renderizar la imagen de cada
  moneda y colorear la celda de cambio 24h.
- **`currency-converter`** usa `@zhunam/form-builder` en `mode="live"`
  para recalcular el valor convertido mientras el usuario escribe o
  cambia de moneda, sin un botón de submit.
- **`crypto-dashboard.ts`** (el contenedor) usa `@zhunam/pdf-generator`
  directamente (`generatePdf` + `.download()`, sin componente de
  preview) para exportar un reporte del estado actual del mercado.
- El resto de los componentes (`price-ticker`, `market-state`,
  `trending-carousel`, `coin-spinner`) consumen el mismo
  `CoinGeckoService`, sin lógica de red propia.

## Más detalle

El [ROADMAP.md](../../../../ROADMAP.md) de `portfolio-showcase` tiene el
detalle completo de decisiones, investigación de la API real, y
lecciones encontradas durante esta fase. Esta nota no lo duplica.
