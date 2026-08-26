# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `PdfBlock` types (`PdfTextBlock`, `PdfColumnBlock`, `PdfRowBlock`,
  `PdfTableBlock`, `PdfImageBlock`, `PdfSpacerBlock`,
  `PdfPageBreakBlock`) and `PdfTemplate`: declarative shapes for a PDF
  document's header, footer, and body, ahead of the compiler that will
  turn them into a real document.
- `PdfTemplateSecurityError`: thrown when a template path attempts
  prototype pollution (`__proto__`/`constructor`/`prototype`) instead
  of naming a real key; catchable separately from ordinary template
  misuse.
- `pdfText`, `pdfHeading`, `pdfColumn`, `pdfRow`, `pdfSpacer`,
  `pdfPageBreak`, and `PdfTemplateValidationError`: factory functions
  that build `PdfBlock`s directly (no data resolution yet, that happens
  in `generatePdf()`), plus the error thrown for invalid factory input
  (e.g. `pdfSpacer()` with a non-positive height), distinct from
  `PdfTemplateSecurityError`.
- `pdfTable`: factory function that builds a `PdfTableBlock` from a
  `rowsPath` and a list of `PdfTableColumn`s.
- `pdfImage`: factory function that builds a `PdfImageBlock` from a
  `srcPath` and an optional `width`.
- `generatePdf<T>()`, `PdfResult`, and `PdfGenerateOptions`: compiles a
  `PdfTemplate` against a data object into a real PDF, for every block
  type, including image. `PdfResult` exposes `download()`, `open()`,
  `getBlob()`, and `toBase64()`.
- Full image support in `generatePdf()`: a `PdfImageBlock.srcPath`
  resolving to a `data:` URI is always allowed and inlined directly; one
  resolving to an `http(s)://` URL is only allowed when its host is
  listed in `PdfGenerateOptions.allowedRemoteHosts` (`[]` by default,
  every remote image denied), otherwise `generatePdf()` rejects with
  `PdfTemplateSecurityError` before any PDF is produced, never a partial
  one.
- `PdfPreview` and `PdfPreviewModule`: standalone component that calls
  `generatePdf()` and previews the result in an `<iframe>` via a
  sanitized blob URL, reactive to its `template`/`data`/`options`
  signal inputs. Re-generates on any input change, cancelling a
  still-in-flight older generation so it can never overwrite a newer
  one's result, and always revokes its previous blob URL before
  creating the next one (and on destroy). Exposes `status`
  (`'idle' | 'generating' | 'ready' | 'error'`), `error`, and `safeUrl`
  as readonly signals, plus a `generationError` output emitted once per
  failed attempt. `@angular/platform-browser` is now a peerDependency
  (`DomSanitizer`).
- `--pdf-preview-height` CSS custom property on `PdfPreview` (default
  `600px`): controls the component's, and therefore its `<iframe>`'s,
  height directly from the consumer's own stylesheet. Width always
  fills the container at 100%. The `<iframe>` itself draws no border or
  radius of its own; wrap `<lib-pdf-preview>` in whatever bounded-panel
  styling the consuming app already uses.

### Changed
- `generatePdf()` now renders the document fully before resolving,
  instead of deferring the first real render to whichever `PdfResult`
  method the consumer happened to call first. This means any rendering
  error, including one raised from inside a malicious `header`/`footer`
  placeholder, now rejects `generatePdf()` itself, the same as every
  other error case in this library. Previously such an error only
  surfaced later, from `result.getBlob()`/`result.toBase64()`. Once
  `generatePdf()` resolves, `getBlob()`, `toBase64()`, `download()`,
  and `open()` can no longer fail: they all reuse that single render,
  they never ask pdfmake to render again.
- `PdfPreview`'s `safeUrl` now appends `#navpanes=0` to the blob URL it
  wraps, so the iframe defaults to hiding the browser's native PDF
  viewer's own thumbnail/outline side panel. Only the URL handed to
  `bypassSecurityTrustResourceUrl()` carries the fragment; the blob URL
  `BlobUrlLifecycle` creates and revokes internally is unaffected. Not
  configurable yet.
