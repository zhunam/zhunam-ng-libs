/**
 * Options that control how `generatePdf()` renders a `PdfTemplate`,
 * separate from the template itself.
 */
export interface PdfGenerateOptions {
  /**
   * Hosts a remote (`http`/`https`) image URL is allowed to come from,
   * across every `PdfImageBlock` in the template. Deliberately not a
   * field on `PdfImageBlock` or anywhere in `PdfTemplate`: the template
   * is data, potentially from an untrusted source, while this option is
   * set by whoever calls `generatePdf()` (the consuming app). If the
   * allowlist lived in the template instead, a malicious template could
   * grant itself its own exception and defeat the protection entirely.
   *
   * Not yet enforced by this file, this type is defined here ahead of
   * the task that wires it into image resolution, so it isn't a dead
   * field for long, not a finished feature yet.
   * @default []
   */
  allowedRemoteHosts?: string[];
}
