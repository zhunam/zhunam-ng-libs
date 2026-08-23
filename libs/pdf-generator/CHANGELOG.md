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
