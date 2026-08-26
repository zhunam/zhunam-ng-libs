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
  efectos secundarios al importar el módulo): el peso real de pdfmake se
  difiere vía el `import()` dinámico dentro de `generatePdf()`
  (`internal/load-pdf-engine.ts`), independiente de si la ruta que aloja
  el componente es lazy o eager. Nadie paga ese costo hasta que
  efectivamente se genera un PDF, sea cual sea la estrategia de ruteo de
  la app consumidora; no hace falta lazy-load a nivel de ruta para lograr
  el objetivo de bundle size, así que no es un requisito documentado en
  el README. La demo de `portfolio-showcase` usa una ruta eager
  (`component:`, no `loadComponent:`), consistente con las otras tres
  demos existentes, y es la decisión correcta ahí: nada distinto que
  justifique una excepción al patrón de ruteo del resto de la app.

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
- [x] `PdfPreview` standalone (`lib/pdf-preview/`), iframe + blob +
      sanitizer interno + revoke en destroy/regeneración, reactivo a
      signals. `effect()` lee `template()`/`data()`/`options()`
      sincrónicamente antes de cualquier `await` y usa `onCleanup` para
      cancelar resultados obsoletos, verificado con un test específico
      de condición de carrera (la generación más nueva gana aunque la
      más vieja resuelva después). `@angular/platform-browser` es
      peerDependency nueva (`DomSanitizer`); `@angular/common` se sacó
      de peerDependencies, el componente no terminó usando nada de ahí
      (`@if` es sintaxis nativa del compilador, no un import). Este
      workspace no tiene `zone.js` instalado (zoneless): el trabajo
      async del `effect()` se registra con `PendingTasks.add()`
      (`@angular/core`, estable) para que tanto la app real
      (SSR/estabilidad zoneless) como `fixture.whenStable()` en tests
      sepan que sigue en curso, confirmado directamente (sin esto,
      `whenStable()` no esperaba nada). `generatePdf()` se llama detrás
      de un `InjectionToken` interno (`GENERATE_PDF`, no exportado del
      barril): el test runner de este workspace rechaza `vi.mock()`
      sobre imports relativos ("Please use Angular TestBed for mocking
      dependencies"), así que el spec sobreescribe el token vía
      provider de TestBed en lugar de mockear el módulo.
- [x] `NgModule` wrapper de `PdfPreview` (`PdfPreviewModule`).
- [x] `vitest.config.ts` con `isolate: true`.
- [x] Estrategia de test de pdfmake: integración real (PDFs
      generados de verdad, sin mockear pdfmake en sí) para la mayoría
      de los casos, con fetch mockeado puntualmente solo en los tests
      de imágenes remotas. `isolate: true` en `vitest.config.ts` sigue
      vigente por la razón original (specs que tocan el mismo recurso
      externo sin aislar entre archivos).
- [x] Tests de seguridad end-to-end contra `generatePdf()` real
      (`src/generate-pdf-security.spec.ts`, no contra piezas internas
      aisladas, esas ya tenían su propia cobertura): prototype
      pollution en cada punto de la API pública donde hay un path
      (texto de body, `PdfTableColumn.path`, `PdfTableBlock.rowsPath`,
      `PdfImageBlock.srcPath`, y dentro de header/footer), un
      "kitchen sink" con varios vectores combinados, sin motor de
      expresiones (`{{1 + 1}}`, `{{require('fs')}}` se tratan como
      clave literal, no como código), dato del consumidor que contiene
      literalmente `"{{__proto__.algo}}"` se inserta como texto plano
      sin re-resolverse ni disparar el error de seguridad (es dato, no
      ataque al template), imagen remota denegada por defecto de punta
      a punta confirmando que `fetch` nunca se invoca, control positivo
      con host permitido, y distinción de `PdfTemplateValidationError`
      vs `PdfTemplateSecurityError` preservada a través de la función
      pública completa. Hallazgo real distinto de lo esperado: el
      header/footer se compila de forma perezosa (pdfmake solo invoca
      ese callback recién al renderizar, no durante `compileTemplate()`
      /`generatePdf()`), así que originalmente un placeholder malicioso
      ahí NO hacía que `generatePdf()` rechazara, sino recién
      `result.getBlob()`. Corregido después (ver la tarea de eager
      render más abajo): `generatePdf()` ahora fuerza ese render antes
      de devolver nada, así que este caso quedó igual que cualquier
      otro, `generatePdf()` mismo rechaza.
- [x] Eager render en `generatePdf()`: fuerza un `getBlob()` completo
      sobre el `TCreatedPdf` de pdfmake antes de devolver el
      `PdfResult`, en vez de dejar que la primera llamada del
      consumidor a `getBlob()`/`toBase64()` dispare el primer render
      real de forma perezosa. Motivado por el hallazgo de la tarea
      anterior: con render perezoso, un error de renderizado
      (incluido uno de un header/footer malicioso) no rechazaba
      `generatePdf()` sino recién el primer método de `PdfResult` que
      lo disparara, inconsistente con todos los demás errores de la
      librería. Confirmado empíricamente contra pdfmake real antes de
      implementar (no asumido): `TCreatedPdf` cachea su render
      internamente en la misma instancia (una segunda llamada a
      `getBuffer()` devuelve el mismo objeto de buffer, y `download()`
      llamado después de un `getBuffer()` no vuelve a invocar el
      callback de header/footer), así que no hizo falta reimplementar
      `download()`/`open()` a mano desde un `Blob` cacheado, siguen
      delegando directo a pdfmake y reusan ese mismo render sin costo
      extra. `getBlob()`/`toBase64()` del `PdfResult` devuelto quedan
      respaldados por ese único `Blob` cacheado (mismo objeto en cada
      llamada, verificado con test dedicado), nunca vuelven a pedirle
      nada a pdfmake.
- [x] Demo consuming the library
      → apps/portfolio-showcase/src/app/pages/pdf-generator-demo/
      Relevamiento previo confirmó que pdf-generator no tenía ninguna
      entrada en shared/libraries.ts todavía, ni siquiera "Coming
      Soon" (el supuesto original de esta tarea era incorrecto): se
      agregó desde cero (`status: 'available'`, `route:
      '/pdf-generator'`), junto con la cuarta tarjeta en home.ts/html
      y la corrección del texto del FAQ ("Three so far" → "Four so
      far"). Misma estructura de shell (drawer/sidebar) copiada a mano
      de auth-demo.html/.scss, consistente con que data-grid/
      form-builder/auth ya la triplican así, sin extraer nada
      compartido (ver Future ideas del ROADMAP raíz). Formulario
      editable (cliente + ítems) con signals puros, sin reactive
      forms; `<lib-pdf-preview>` consume el data object computado
      directo, sin botón "generar"; estado `generating`/`error`
      visible en la página vía una referencia de plantilla al
      componente (`#preview`), no solo el caso feliz. Dato mock nuevo
      en `shared/mock-invoice-template.ts` (`PdfTemplate` de factura +
      `DemoInvoiceData`), con un logo inline como `data:` URI para no
      requerir `allowedRemoteHosts` en la demo. Verificado con
      Playwright real (Chromium ya instalado para
      `portfolio-showcase-e2e`, script descartable, no un spec nuevo
      permanente): el `<iframe>` obtiene una URL `blob:` real al
      cargar y otra distinta al editar el formulario, cero errores de
      consola. `nx build portfolio-showcase --configuration=production`
      y `nx lint portfolio-showcase` limpios. `nx test
      portfolio-showcase` tiene una falla preexistente no relacionada
      (`NG0201: No provider found for ActivatedRoute` en varios specs
      con `RouterLink`, confirmado con `git stash` que ya fallaba
      antes de esta tarea, documentado como lección de infraestructura
      en el ROADMAP raíz, fuera de alcance arreglarlo acá).
- [x] README.md (instalación, ejemplo <10 líneas, tabla de API,
      compatibilidad Angular, licencia). Mismo patrón que
      data-grid/form-builder/auth: título + párrafo, Installation,
      Usage, API, Compatibility, Why this one, License, footer. El
      ejemplo de uso se verificó de verdad, no de memoria: `tsc`
      contra los tipos reales de `dist/libs/pdf-generator` (ya
      buildeado), no contra los fuentes de `src/`. Compatibility usa
      el formato de una línea de data-grid/form-builder (mayoría 2/3),
      no la tabla de auth, porque acá hay solo un entry point con dos
      peerDependencies siempre requeridas, no varias opcionales según
      qué se importe. Se agregó una sección "Content Security Policy"
      (no presente en ninguna de las otras 3 READMEs) por la regla de
      seguridad #5 de este mismo ROADMAP, análoga en posición a la
      sección "Security" propia de auth: contenido específico de esta
      librería, insertado en el mismo lugar del patrón común donde
      auth también se desvía para agregar contenido propio.
- [x] Verify production build
      → nx build pdf-generator --configuration=production
      Limpio: `nx run pdf-generator:build:production` sin warnings ni
      errores (`ng-packagr`, compilación AOT en modo de compilación
      parcial, FESM + DTS + manifest escritos sin diferencias respecto
      al build en modo default). Confirmado que "modo default" y
      "modo production" son el mismo build para esta librería:
      `project.json` tiene `defaultConfiguration: "production"` en el
      target `build`, así que cada `nx build pdf-generator` corrido a
      lo largo de esta librería (sin flag explícito) ya usaba
      `tsconfig.lib.prod.json`, la única diferencia real entre
      configuraciones (`development` no sobreescribe nada). Re-corrido
      sin caché (`--skip-nx-cache`) para confirmar un log fresco, no
      solo un hit de caché de una corrida anterior.
