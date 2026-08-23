import { PdfTemplateSecurityError } from '../errors/pdf-template-security-error';
import { PdfTemplateValidationError } from '../errors/pdf-template-validation-error';
import { resolveTemplateString } from './resolve-path';

/**
 * Resolves a `PdfImageBlock.srcPath` against `data` (via
 * `resolveTemplateString()`, inheriting its `__proto__`/`constructor`/
 * `prototype` denylist as-is, not reimplemented here) and enforces
 * `PdfGenerateOptions.allowedRemoteHosts` against the resolved value.
 *
 * v1 only supports two resolved shapes: a `data:` URI (always allowed,
 * safe by construction, no host check) or an `http(s)://` URL whose
 * host is in `allowedRemoteHosts`. A local file path, a relative path,
 * or a reference into pdfmake's own vfs is not supported in v1,
 * deliberately, this isn't a "not implemented yet", every other shape
 * is rejected outright.
 *
 * @throws {PdfTemplateSecurityError} If the resolved value is an
 * `http(s)://` URL whose host isn't in `allowedRemoteHosts` (also
 * thrown, inherited from `resolveTemplateString()`, if `srcPath` itself
 * contains an unsafe path segment).
 * @throws {PdfTemplateValidationError} If the resolved value is neither
 * a `data:` URI nor an `http(s)://` URL.
 */
export function resolveImageSource(
  srcPath: string,
  data: unknown,
  allowedRemoteHosts: string[] = [],
): string {
  const resolved = resolveTemplateString(srcPath, data);

  if (resolved.startsWith('data:')) {
    return resolved;
  }

  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    const { hostname } = new URL(resolved);

    if (!allowedRemoteHosts.includes(hostname)) {
      throw new PdfTemplateSecurityError(
        `Blocked remote image host "${hostname}": not in allowedRemoteHosts.`,
      );
    }

    return resolved;
  }

  throw new PdfTemplateValidationError(
    `Unsupported image source "${resolved}": v1 only supports a data: URI or an allowed http(s) remote URL, not a local or relative path.`,
  );
}
