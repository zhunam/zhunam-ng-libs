/**
 * A generated PDF document, ready to hand to the user or ship elsewhere,
 * returned by `generatePdf()`.
 */
export interface PdfResult {
  /**
   * Triggers a browser download of the PDF.
   * @example
   * result.download('invoice.pdf');
   */
  download(filename: string): void;

  /**
   * Opens the PDF in a new browser tab or window.
   */
  open(): void;

  /**
   * Resolves to the PDF as a `Blob`, of type `application/pdf`.
   */
  getBlob(): Promise<Blob>;

  /**
   * Resolves to the PDF encoded as a base64 string.
   */
  toBase64(): Promise<string>;
}
