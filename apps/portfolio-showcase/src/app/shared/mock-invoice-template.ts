import {
  pdfHeading,
  pdfImage,
  pdfTable,
  pdfText,
  type PdfTemplate,
} from '@zhunam/pdf-generator';

export interface DemoInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface DemoInvoiceData {
  clientName: string;
  items: DemoInvoiceItem[];
}

export const initialInvoiceData: DemoInvoiceData = {
  clientName: 'Ada Lovelace',
  items: [
    { description: 'Consulting hours', quantity: 8, unitPrice: 75 },
    { description: 'Support plan (monthly)', quantity: 1, unitPrice: 120 },
  ],
};

// A 32x32 document/invoice pictogram (folded-corner page + text lines),
// hand-built pixel by pixel and PNG-encoded, not a single stretched
// pixel: pdfmake only accepts a raster data: URI for `image` content,
// confirmed empirically that an SVG data: URI is rejected outright
// ("Unknown image format"), so a small vector mark wasn't an option
// here. Colored with the app's own Signal Teal / Signal-Teal-on-dark
// tokens (see apps/portfolio-showcase/DESIGN.md), white background to
// match the PDF page so it reads as sitting directly on it, no visible
// bounding box. Inlined as a literal data: URI directly in the template
// (never resolved from editable data), so the demo works against
// generatePdf()'s default allowedRemoteHosts ([], every remote image
// denied) without teaching visitors to widen that allowlist just to see
// a logo render.
const LOGO_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAQ0lEQVR4nGP4T2PAMGoB2RboxMeShEYtGLVgWFuASwGRygaBBUM/DkYjmaDOoR8HAxPJQ8qCoR8HtLKAWmDUgoG3AADFI2bGLNaPeQAAAABJRU5ErkJggg==';

/**
 * Invoice `PdfTemplate` for the pdf-generator demo. `items` rows already
 * carry a `total` field (`quantity * unitPrice`) computed by the demo
 * component before it reaches `generatePdf()`: `PdfTableColumn.path` only
 * ever reads a value, it can't compute one, by design (see "Motor de
 * expresiones en placeholders" in libs/pdf-generator/ROADMAP.md).
 */
export const invoiceTemplate: PdfTemplate = {
  header: pdfImage(LOGO_DATA_URI, { width: 32 }),
  footer: pdfText('Page {{pageNumber}} of {{pageCount}}', {
    alignment: 'right',
    fontSize: 8,
    color: '#94a3b8',
  }),
  body: [
    pdfHeading('Invoice', 1),
    pdfText('Billed to: {{clientName}}', { fontSize: 11 }),
    pdfTable('items', {
      columns: [
        { header: 'Description', path: 'description' },
        { header: 'Qty', path: 'quantity', width: 50 },
        { header: 'Unit price', path: 'unitPrice', width: 70 },
        { header: 'Total', path: 'total', width: 70 },
      ],
    }),
  ],
};
