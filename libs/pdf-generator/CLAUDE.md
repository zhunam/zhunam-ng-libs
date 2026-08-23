# pdf-generator

## Propósito

Generador de documentos PDF 100% client-side para Angular. A diferencia
de usar jsPDF/pdfmake directo (como hace hoy cualquier tutorial de
"Angular + PDF"), expone una API declarativa y tipada (`PdfTemplate`)
compuesta con funciones factory (`pdfText`, `pdfTable`, `pdfColumn`...),
reactiva a signals, con componente de preview en vivo incluido.

## Motor interno

pdfmake corre por debajo, oculto por completo. Nunca se expone un tipo
de pdfmake en la API pública (Inputs/Outputs/retornos), para poder
cambiar de motor en el futuro sin romper compatibilidad. Ver ROADMAP.md
para el detalle de la API y las reglas de seguridad del resolver de
placeholders (obligatorias, no opcionales).

## Notas técnicas de pdfmake 0.3.11 (verificado empíricamente)

Hallazgos confirmados corriendo pdfmake real (no asumidos desde
tutoriales viejos ni solo desde `@types/pdfmake`, que a veces no
coincide con el runtime real). Cualquier tarea futura que toque
`internal/load-pdf-engine.ts`, `internal/compile-template.ts` o
`internal/pdfmake-types.ts` debería partir de esto, no redescubrirlo:

- `pdfMake.addVirtualFileSystem(vfs)` es la API real para registrar el
  vfs de fuentes. `pdfMake.vfs = ...` (el patrón de tutoriales
  0.1.x/0.2.x) ya no existe, la propiedad es `undefined`.
- El `import()` dinámico de `pdfmake/build/pdfmake.js` expone el objeto
  real bajo `.default`, no como exports nombrados de nivel superior,
  pese a que `@types/pdfmake` lo describe como si `createPdf`,
  `addVirtualFileSystem`, etc. fueran exports nombrados directos. El
  namespace importado además incluye ~180 exports nombrados no
  relacionados (utilidades internas de zlib/crypto del bundle
  webpack), ninguno es la API real.
- `italic` se llama `italics` en `PdfTextOptions`/`Style` de pdfmake.
  El resto de los campos de texto (`bold`, `fontSize`, `color`,
  `alignment`) coinciden exactamente.
- Márgenes de página como tupla de 4: `[left, top, right, bottom]`.
- El callback real de header/footer recibe 3 parámetros
  (`currentPage, pageCount, pageSize`), no 2. Esta librería solo usa
  los primeros 2, TypeScript permite una función con menos parámetros
  de los que el tipo declarado espera, así que no es un error de tipos,
  pero el tercero (`pageSize`) existe y se descarta en silencio.
- `TDocumentDefinitions`, `TVirtualFileSystem`, y `Column` no se
  reexportan por nombre desde `pdfmake/build/pdfmake.js` (solo
  `Content`, `Style`, `Table`, `TableCell`, `TCreatedPdf` sí). Están
  derivados estructuralmente a partir de las firmas reales de
  `createPdf`/`addVirtualFileSystem` en `internal/pdfmake-types.ts`,
  no importados por nombre.

## Independencia

No importa nada de `libs/data-grid`, `libs/form-builder` ni `libs/auth`.
Es standalone, instalable sola.

## Nota proactiva de testing

form-builder tuvo un bug real en CI (Linux) por specs que mockeaban el
mismo SDK externo sin aislamiento (`isolate: false` por defecto en
`@nx/angular:unit-test`). Esta librería usa pdfmake real (sin mockear)
en sus specs de integración (`compile-template.spec.ts`,
`generate-pdf.spec.ts`), así que el bug de form-builder no aplica tal
cual todavía; si en algún momento se agrega un mock de pdfmake en
varios archivos de spec en paralelo, el mismo riesgo reaparece. El
`vitest.config.ts` con `test: { isolate: true }` ya está puesto desde
el primer spec, no esperar a que CI lo revele.
