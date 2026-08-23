# ROADMAP: pdf-generator

## Scope v1

### Adentro
- Bloques: texto, heading, columna, fila, tabla simple (sin merge de
  celdas), imagen, spacer, salto de página manual.
- Header/footer con `{{pageNumber}}`/`{{pageCount}}` como placeholders
  reservados.
- Tamaño A4/Letter, márgenes configurables.
- `NgModule` wrapper del componente de preview desde el día uno (no
  retroactivo, a diferencia de data-grid/form-builder/auth).
- `PdfResult` con `download()`, `open()`, `getBlob()`, `toBase64()`.
- Preview vía `<iframe>` + blob URL (visor nativo del navegador, no una
  librería de parsing de PDF embebida).

### Afuera de v1 (Future ideas del ROADMAP raíz)
- AcroForms, firma digital, encriptación.
- Fuentes custom embebidas (candidato a entry point secundario futuro).
- Tablas con celdas combinadas o layouts anidados complejos.
- Preview enriquecido (paginación interactiva, zoom).
- Edición de PDFs existentes: fuera de dominio, no se mezcla acá.
- **Motor de expresiones en placeholders: rechazado de forma permanente,
  no es un "todavía no", es una decisión de seguridad fija.**

## Contrato de API pública

```ts
export interface PdfTemplate {
  pageSize?: 'A4' | 'LETTER';
  margins?: PdfMargins;
  header?: PdfBlock;
  footer?: PdfBlock;
  body: PdfBlock[];
}

export type PdfBlock =
  | PdfTextBlock | PdfColumnBlock | PdfRowBlock
  | PdfTableBlock | PdfImageBlock | PdfSpacerBlock | PdfPageBreakBlock;

export function pdfText(content: string, opts?: PdfTextOptions): PdfTextBlock;
export function pdfHeading(content: string, level?: 1 | 2 | 3): PdfTextBlock;
export function pdfColumn(children: PdfBlock[], opts?: PdfLayoutOptions): PdfColumnBlock;
export function pdfRow(children: PdfBlock[], opts?: PdfLayoutOptions): PdfRowBlock;
export function pdfTable(rowsPath: string, opts: { columns: PdfTableColumn[] }): PdfTableBlock;
export function pdfImage(srcPath: string, opts?: { width?: number }): PdfImageBlock;
export function pdfSpacer(height: number): PdfSpacerBlock;
export function pdfPageBreak(): PdfPageBreakBlock;

export function generatePdf<T>(
  template: PdfTemplate,
  data: T,
  options?: PdfGenerateOptions
): Promise<PdfResult>;

export interface PdfResult {
  download(filename: string): void;
  open(): void;
  getBlob(): Promise<Blob>;
  toBase64(): Promise<string>;
}
```

## Seguridad: resolución de placeholders (obligatorio, verificado con tests)

1. El resolver de `{{path}}` únicamente lee valores por clave (dot-path);
   nunca evalúa expresiones. No se agrega soporte de expresiones
   (`{{precio * cantidad}}`) en ninguna versión futura sin revisión de
   seguridad explícita.
2. Denylist obligatorio de segmentos `__proto__`, `constructor`,
   `prototype` en cualquier path (previene prototype pollution,
   CWE-1321). Test dedicado que intenta contaminar `Object.prototype`.
3. El valor resuelto se inserta siempre como texto literal, nunca se
   re-parsea como sintaxis del template.
4. Imágenes remotas denegadas por defecto: `allowedRemoteHosts` vacío o
   ausente (el default real, no solo el tipo) significa que ninguna
   imagen remota está permitida. `allowedRemoteHosts` vive en
   `PdfGenerateOptions` (lo controla quien llama a `generatePdf()`, la
   app consumidora), nunca en `PdfImageBlock` (parte del template, no
   confiable): si la lista blanca fuera parte del template, un template
   malicioso podría declararse a sí mismo su propia excepción y anular
   la protección por completo. Un `srcPath` resuelto a data URI (base64)
   nunca pasa por esta validación, es local/seguro por naturaleza.
   Motivado por CVE-2026-26801 real de pdfmake sobre fetch de URLs sin
   restricción.
5. El preview usa el visor nativo del navegador vía iframe + blob URL,
   nunca una librería de renderizado de PDF embebida. El bypass del
   sanitizador de Angular (`bypassSecurityTrustResourceUrl`) se aplica
   únicamente a blobs generados internamente, nunca a una URL de input
   público. Blob URLs se revocan en `ngOnDestroy` y en cada
   regeneración. README documenta el requisito de CSP (`frame-src blob:`).

## Decisiones de arquitectura

- pdfmake es `dependencies` real de esta librería (no `peerDependencies`
  como firebase/supabase en auth): el consumidor nunca lo instala ni lo
  ve, es un detalle interno reemplazable.
- No importar `vfs_fonts` de forma eager en ningún archivo de nivel
  superior: se carga vía `import()` dinámico dentro de `generatePdf()`,
  nunca al importar la librería. Es necesario siempre (no solo para
  fuentes custom), porque pdfmake no puede calcular anchos de texto
  para Roboto, la fuente default, sin él. La ganancia de peso sigue
  siendo real: nadie paga este costo hasta que efectivamente se
  genera un PDF, no en la carga inicial de la app.
- El componente de preview debe ser standalone y lazy-load-friendly (sin
  efectos secundarios al importar el módulo), documentar en README que
  se recomienda cargarlo detrás de una ruta lazy.

## Tareas 

- [x] Tipos base (`PdfBlock` union, `PdfTemplate`, `PdfMargins`,
      `PdfTableColumn`) — solo tipos, sin lógica.
- [x] Resolver de placeholders seguro + tests (denylist prototype
      pollution, texto literal, dot-path).
- [x] Funciones factory (`pdfText`, `pdfHeading`, `pdfColumn`, `pdfRow`,
      `pdfSpacer`, `pdfPageBreak`).
- [x] Factory + compilador de `pdfTable` (rowsPath → filas de pddfmake).
- [x] Factory de `pdfImage` (`srcPath`, `width` opcional). El
      enforcement de `allowedRemoteHosts` se resuelve en
      `PdfGenerateOptions`/`generatePdf()`, no acá, ver más abajo (ya
      implementado).
- [x] Compilador principal: `PdfTemplate` + `data` → `docDefinition` de
      pdfmake, para todo tipo de bloque incluida imagen (texto, columna,
      fila, tabla, spacer, pageBreak, imagen). Incluye la carga perezosa
      del motor y las fuentes de pdfmake (`internal/load-pdf-engine.ts`),
      memoizada, `import()` dinámico nunca top-level.
- [x] `generatePdf<T>()` + `PdfResult` (download/open/getBlob/toBase64).
- [x] Compilar `PdfImageBlock` de verdad
      (`internal/resolve-image-source.ts`): `srcPath` resuelto vía
      `resolveTemplateString` (hereda la protección de paths), un
      `data:` URI se inlinea directo en `{ image: ... }`, una URL
      remota se enforcea contra `PdfGenerateOptions.allowedRemoteHosts`
      (`[]` por defecto deniega todo) y, si está permitida, no se
      inlinea: pdfmake solo llega a hacer el fetch real cuando la
      imagen se referencia por nombre vía `TDocumentDefinitions.images`,
      no cuando la URL va directo en `image:` (confirmado
      empíricamente, ver `libs/pdf-generator/CLAUDE.md`), así que el
      compilador arma un diccionario `images` compartido
      (`img_0`, `img_1`...) propagado por toda la cadena de
      `compileBlock`/`compileHeaderFooter`/`compileTemplate`, incluidas
      imágenes referenciadas solo en header/footer (el diccionario se
      pasa por referencia y se lee en vivo cuando pdfmake recién
      invoca esos callbacks, no antes). `pdfMake.setUrlAccessPolicy()`
      no se configura: confirmado que el default ya permite el fetch
      sin tocar nada, y no sería el punto real de enforcement de todos
      modos (eso es `resolveImageSource`, por-llamada, antes de que
      pdfmake se entere de que la URL existe).
- [x] Ciclo de vida de blob URLs (creación/revocación) centralizado:
      `internal/blob-url-lifecycle.ts`, `BlobUrlLifecycle` (`set()`
      revoca la URL anterior antes de crear la nueva, `revoke()` es
      no-op seguro si no hay ninguna activa). jsdom no implementa
      `URL.createObjectURL`/`revokeObjectURL` (confirmado, son
      `undefined` en el entorno de test real de este workspace),
      mockeadas vía `vi.stubGlobal('URL', ...)` en el spec.
- [ ] `PdfPreviewComponent` standalone (iframe + blob + sanitizer
      interno + revoke en destroy/regeneración, reactivo a signals).
- [ ] `NgModule` wrapper de `PdfPreviewComponent`.
- [x] `vitest.config.ts` con `isolate: true`.
- [x] Estrategia de test de pdfmake: integración real (PDFs
      generados de verdad, sin mockear pdfmake en sí) para la mayoría
      de los casos, con fetch mockeado puntualmente solo en los tests
      de imágenes remotas. `isolate: true` en `vitest.config.ts` sigue
      vigente por la razón original (specs que tocan el mismo recurso
      externo sin aislar entre archivos).
- [ ] Tests de seguridad: prototype pollution, texto literal ante
      marcado, imagen remota denegada por defecto.
- [ ] Demo consuming the library
      → apps/portfolio-showcase/src/app/pages/pdf-generator-demo/
      Misma estructura de shell que las demás demos (header, sidebar
      de DESIGN.md), sin layout propio ni distinto. La entrada de
      pdf-generator en el sidebar pasa de "Coming Soon" (<span> no
      interactivo) a un <a> real apuntando a esta página, siguiendo
      el mismo patrón que data-grid, no una excepción.
- [ ] README.md (instalación, ejemplo <10 líneas, tabla de API,
      compatibilidad Angular, licencia).
- [ ] Verify production build
      → nx build pdf-generator --configuration=production
