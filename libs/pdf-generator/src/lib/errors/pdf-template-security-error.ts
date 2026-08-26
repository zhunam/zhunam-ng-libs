/**
 * Thrown when resolving a template against real data hits something
 * that looks like an attack rather than ordinary missing or malformed
 * data: a path segment that could reach `Object.prototype` (via
 * `resolvePath()`/`resolveTemplateString()`), or a resolved image
 * source pointing at a remote host that isn't in
 * `PdfGenerateOptions.allowedRemoteHosts` (via `resolveImageSource()`).
 * Distinct from `PdfTemplateValidationError`, which is reserved for
 * ordinary misuse of the public factory functions, a template-construction
 * mistake, not an attempted policy violation. Exported so a consumer
 * rendering a template sourced from a third party can catch it
 * specifically, instead of a generic `Error`.
 */
export class PdfTemplateSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfTemplateSecurityError';
  }
}
