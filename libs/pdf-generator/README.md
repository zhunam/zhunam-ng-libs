# @zhunam/pdf-generator

A client-side PDF generator for Angular. Instead of wiring up pdfmake
directly, it exposes a declarative, typed API (`PdfTemplate`) composed
from factory functions (`pdfText`, `pdfTable`, `pdfColumn`...), reactive
to signals, with a live preview component included.

## Installation

```bash
npm install @zhunam/pdf-generator
```

pdfmake ships bundled as an internal dependency of this library. You
never install or configure it yourself.

## Usage

```typescript
import { generatePdf, pdfText, type PdfTemplate } from '@zhunam/pdf-generator';

const template: PdfTemplate = { body: [pdfText('Invoice for {{cliente.nombre}}')] };

async function downloadInvoice(): Promise<void> {
  const result = await generatePdf(template, { cliente: { nombre: 'Ada' } });
  result.download('invoice.pdf');
}
```

## API

### Block factories

| Function | Description |
| -------- | ------------ |
| `pdfText(content, opts?)` | Text block. `content` may contain `{{path}}` placeholders resolved against the data object passed to `generatePdf()`. |
| `pdfHeading(content, level?, opts?)` | Heading block. `level` is `1`, `2`, or `3` (default `1`), each with its own preset `fontSize`/`bold`, overridable via `opts`. |
| `pdfColumn(children, opts?)` | Stacks `children` vertically as one column. |
| `pdfRow(children, opts?)` | Places `children` side by side as one row. |
| `pdfTable(rowsPath, opts)` | Table block. Reads its rows from `rowsPath`, rendering `opts.columns` left to right. |
| `pdfImage(srcPath, opts?)` | Image block. Reads its source from `srcPath`. Throws `PdfTemplateValidationError` if `opts.width` is given and isn't positive. |
| `pdfSpacer(height)` | Fixed vertical whitespace. Throws `PdfTemplateValidationError` if `height` isn't positive. |
| `pdfPageBreak()` | Forces a page break. |

### `generatePdf<T>(template, data, options?)`

Compiles a `PdfTemplate` against a data object into a real PDF, resolving
to a `PdfResult` only once the document has fully rendered. Rejects with
`PdfTemplateSecurityError` or `PdfTemplateValidationError`, see Errors
below.

| `PdfResult` member | Description |
| -------------------- | -------------- |
| `download(filename)` | Triggers a browser download of the PDF. |
| `open()` | Opens the PDF in a new browser tab or window. |
| `getBlob()` | Resolves to the PDF as a `Blob`, of type `application/pdf`. |
| `toBase64()` | Resolves to the PDF encoded as a base64 string. |

`options.allowedRemoteHosts` (`PdfGenerateOptions`, default `[]`) is the
only way to allow a `PdfImageBlock` to load its image from a remote
`http`/`https` host; a `data:` URI is always allowed.

### `PdfPreview` (`<lib-pdf-preview>`)

Generates a PDF from a `PdfTemplate` and a data object, and previews it
in an `<iframe>` using the browser's native PDF viewer. Re-generates
whenever `template`/`data`/`options` change.

| Name | Type | Default | Description |
| ------------------ | -------------------------------- | -------- | -------------------------------------------------------- |
| `template`         | `input.required<PdfTemplate>`     | Required | Template describing the PDF to generate.                 |
| `data`             | `input.required<unknown>`         | Required | Data object the template is compiled against.             |
| `options`          | `input<PdfGenerateOptions>`       | None     | Generation options, forwarded to `generatePdf()` as-is.   |
| `generationError`  | `output<Error>`                   | N/A      | Emitted once per failed generation attempt.               |

`PdfPreviewModule`: `NgModule` wrapper for consumers still on a classic
NgModule architecture (`imports: [PdfPreviewModule]`). The standalone
component is still the recommended way to consume it.

`PdfPreview` sizes and themes itself via CSS custom properties, set from
the consuming app's own stylesheet:

| Custom property | Default | Description |
| ------------------------- | -------- | -------------------------------------------------- |
| `--pdf-preview-height`    | `600px`  | Height of the component and its `<iframe>`. Width always fills the container at 100%. |
| `--pdf-preview-text-color` | `#374151` | Color of the "Generating PDF…" status text. |
| `--pdf-preview-error-color` | `#dc2626` | Color of the error message text. |
| `--pdf-preview-font-family` | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | Font used for status/error text. |

The `<iframe>` itself has no border or radius: wrap `<lib-pdf-preview>`
in whatever bounded-panel styling your own app already uses.

### Errors

| Error | Thrown when |
| ------- | ------------- |
| `PdfTemplateSecurityError` | A template path could reach `Object.prototype`, or a resolved image source points at a remote host not listed in `allowedRemoteHosts`. |
| `PdfTemplateValidationError` | A block factory is misused (e.g. `pdfSpacer()`/`pdfImage()` with a non-positive size), or resolved data doesn't match what the template expects (e.g. a `rowsPath` that doesn't resolve to an array). |

## Compatibility

`@angular/core` and `@angular/platform-browser` `^20.0.0 || ^21.0.0 || ^22.0.0`.

## Content Security Policy

`PdfPreview` renders its result in an `<iframe>` pointed at a `blob:`
URL created internally. If your app sets a `Content-Security-Policy`
header, make sure `frame-src` (or `child-src`, depending on which
directive your policy uses) includes `blob:`, otherwise the browser
blocks the iframe from loading it.

## Why this one

Declarative and typed instead of wiring up pdfmake by hand: build a
`PdfTemplate` from factory functions, `generatePdf()` handles the rest.
The placeholder resolver only ever reads plain dot-paths, never
evaluates expressions, and rejects any path that could reach
`Object.prototype` before it touches pdfmake. Remote images are denied
by default; a consuming app opts specific hosts in explicitly, a
template can never grant itself that exception. Live preview included,
`<lib-pdf-preview>` renders the real PDF in the browser's own viewer, no
embedded PDF-parsing library.

## License

MIT

---

Built by Ariana Mora · [LinkedIn](https://www.linkedin.com/in/ariana-andreina-mora) · [GitHub](https://github.com/zhunam)
