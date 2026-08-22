# pdf-generator

## Propósito

Generador de documentos PDF 100% client-side para Angular. A diferencia
de usar jsPDF/pdfmake directo (como hace hoy cualquier tutorial de
"Angular + PDF"), expone una API declarativa y tipada (`PdfTemplate<T>`)
compuesta con funciones factory (`pdfText`, `pdfTable`, `pdfColumn`...),
reactiva a signals, con componente de preview en vivo incluido.

## Motor interno

pdfmake corre por debajo, oculto por completo. Nunca se expone un tipo
de pdfmake en la API pública (Inputs/Outputs/retornos), para poder
cambiar de motor en el futuro sin romper compatibilidad. Ver ROADMAP.md
para el detalle de la API y las reglas de seguridad del resolver de
placeholders (obligatorias, no opcionales).

## Independencia

No importa nada de `libs/data-grid`, `libs/form-builder` ni `libs/auth`.
Es standalone, instalable sola.

## Nota proactiva de testing

form-builder tuvo un bug real en CI (Linux) por specs que mockeaban el
mismo SDK externo sin aislamiento (`isolate: false` por defecto en
`@nx/angular:unit-test`). Esta librería también va a mockear un SDK
externo (pdfmake) en varios specs: configurar `vitest.config.ts` propio
con `test: { isolate: true }` desde el primer spec, no esperar a que
CI lo revele.
