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
  getBlob(): Blob;
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
  superior: solo se carga si el consumidor pide fuentes custom
  (evita que el peso de fuentes se pague aunque no se use).
- El componente de preview debe ser standalone y lazy-load-friendly (sin
  efectos secundarios al importar el módulo), documentar en README que
  se recomienda cargarlo detrás de una ruta lazy.

## Tareas (1-3h cada una, en orden)

- [x] Tipos base (`PdfBlock` union, `PdfTemplate`, `PdfMargins`,
      `PdfTableColumn`) — solo tipos, sin lógica.
- [x] Resolver de placeholders seguro + tests (denylist prototype
      pollution, texto literal, dot-path).
- [x] Funciones factory (`pdfText`, `pdfHeading`, `pdfColumn`, `pdfRow`,
      `pdfSpacer`, `pdfPageBreak`).
- [x] Factory + compilador de `pdfTable` (rowsPath → filas de pddfmake).
- [x] Factory de `pdfImage` (`srcPath`, `width` opcional). El
      enforcement de `allowedRemoteHosts` no es responsabilidad de esta
      factory ni de `PdfImageBlock`: se resuelve en `PdfGenerateOptions`
      / `generatePdf()`, ver la tarea del compilador principal.
- [ ] Compilador principal: `PdfTemplate` + `data` → `docDefinition` de
      pdfmake (bloques de texto/columna/fila/spacer/pageBreak), incluye
      definir `PdfGenerateOptions` por primera vez, con
      `allowedRemoteHosts` adentro, y aplicar el enforcement real de
      imágenes remotas ahí.
- [ ] `generatePdf<T>()` + `PdfResult` (download/open/getBlob/toBase64).
- [ ] Ciclo de vida de blob URLs (creación/revocación) centralizado.
- [ ] `PdfPreviewComponent` standalone (iframe + blob + sanitizer
      interno + revoke en destroy/regeneración, reactivo a signals).
- [ ] `NgModule` wrapper de `PdfPreviewComponent`.
- [x] `vitest.config.ts` con `isolate: true`.
- [ ] Specs de mocks de pdfmake en `vitest.config.ts` (separado de la
      línea anterior: `isolate: true` ya está, los specs recién tienen
      sentido cuando el compilador principal empiece a importar
      `pdfmake`).
- [ ] Tests de seguridad: prototype pollution, texto literal ante
      marcado, imagen remota denegada por defecto.
- [ ] README.md (instalación, ejemplo <10 líneas, tabla de API,
      compatibilidad Angular, licencia).
