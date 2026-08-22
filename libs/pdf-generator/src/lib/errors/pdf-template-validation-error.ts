/**
 * Thrown when a template is built incorrectly through the public block
 * factory functions (e.g. `pdfSpacer()` called with a non-positive
 * height). Distinct from `PdfTemplateSecurityError`, which is reserved
 * for a template path that attempts prototype pollution: this one is
 * for ordinary misuse of the API by whoever is assembling the template,
 * not an attack. Exported so a consumer can catch template-construction
 * mistakes specifically, instead of a generic `Error`.
 */
export class PdfTemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfTemplateValidationError';
  }
}
