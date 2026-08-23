/**
 * Thrown by `resolvePath()` (and, through it, `resolveTemplateString()`
 * and anything else built on top of it) when a template path contains a
 * segment that could reach `Object.prototype`. Distinct from
 * `PdfTemplateValidationError`, which is reserved for ordinary misuse of
 * the public factory functions: this one is specifically for a
 * prototype-pollution attempt, not a template-construction mistake.
 * Exported so a consumer rendering a template sourced from a third party
 * can catch it specifically, instead of a generic `Error`.
 */
export class PdfTemplateSecurityError extends Error {
  constructor(segment: string) {
    super(
      `Blocked path segment "${segment}": it could reach Object.prototype and is never a legitimate template path.`,
    );
    this.name = 'PdfTemplateSecurityError';
  }
}
