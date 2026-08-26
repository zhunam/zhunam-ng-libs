import {
  pdfColumn,
  pdfHeading,
  pdfImage,
  pdfRow,
  pdfSpacer,
  pdfTable,
  pdfText,
  type PdfTemplate,
} from '@zhunam/pdf-generator';

export interface DemoInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Full shape of the data object `invoiceTemplate` resolves `{{path}}`
 * placeholders against. `clientName`/`clientAddress`/`items` are the
 * only fields the demo page lets a visitor edit; the rest (business
 * letterhead info, invoice metadata) stay fixed, and `subtotal`/
 * `taxAmount`/`total` are recomputed from `items` in the demo
 * component every time it changes, the same way each item's own
 * `total` already is, see pdf-generator-demo.ts. `taxRate` is a whole
 * number percent (e.g. `10` for 10%), not a fraction: the template has
 * no expression engine, so `{{taxRate}}%` only ever does a literal
 * string substitution, never a `taxRate * 100` computation.
 */
export interface DemoInvoiceData {
  businessName: string;
  businessAddress: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientName: string;
  clientAddress: string;
  items: DemoInvoiceItem[];
  subtotal: string;
  taxRate: number;
  taxAmount: string;
  total: string;
}

/** Applied to the items subtotal to derive the tax line; a fixed demo policy, not user-editable. */
export const TAX_RATE_PERCENT = 10;

const initialItems: DemoInvoiceItem[] = [
  { description: 'Consulting hours', quantity: 8, unitPrice: 75 },
  { description: 'Support plan (monthly)', quantity: 1, unitPrice: 120 },
];
const initialSubtotal = initialItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
const initialTaxAmount = (initialSubtotal * TAX_RATE_PERCENT) / 100;

export const initialInvoiceData: DemoInvoiceData = {
  businessName: 'Northwind Studio',
  businessAddress: '482 Birch Lane, Portland, OR 97205',
  invoiceNumber: 'INV-2026-014',
  issueDate: 'Aug 26, 2026',
  dueDate: 'Sep 25, 2026',
  clientName: 'Ada Lovelace',
  clientAddress: '10 Analytical Engine Ave, London, UK',
  items: initialItems,
  subtotal: initialSubtotal.toFixed(2),
  taxRate: TAX_RATE_PERCENT,
  taxAmount: initialTaxAmount.toFixed(2),
  total: (initialSubtotal + initialTaxAmount).toFixed(2),
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
 * Invoice `PdfTemplate` for the pdf-generator demo, built entirely from
 * public factory functions (no new block type). Column widths below are
 * fixed point values chosen to fill A4's default content width (595.28pt
 * page minus 40pt margins each side = 515.28pt): the compiler has no
 * concept of `'*'`/`'auto'` sizing through the public API
 * (`PdfLayoutOptions.width` is `number` only), so a real invoice's
 * two-column rows need widths that sum to the available width, chosen
 * by hand here rather than left to guesswork. Verified empirically
 * against the real pdfmake engine (not assumed): a `pdfRow` child with
 * no `width` at all still has its `alignment` resolve against the
 * *full* remaining column width, not packed to its own content size,
 * confirmed by inspecting real rendered text-position operators before
 * relying on it for the BILL TO / PAYMENT DUE and totals rows below.
 * `PdfLayoutOptions.gap` is not consumed by the compiler yet (see its
 * own JSDoc in pdf-block.ts), so adjacent columns sit flush; visual
 * breathing room between rows comes from `pdfSpacer()` instead.
 */
export const invoiceTemplate: PdfTemplate = {
  header: pdfRow([
    pdfColumn([pdfImage(LOGO_DATA_URI, { width: 40 })], { width: 50 }),
    pdfColumn(
      [
        pdfText('{{businessName}}', { bold: true, fontSize: 14 }),
        pdfText('{{businessAddress}}', { fontSize: 9, color: '#64748b' }),
      ],
      { width: 300 },
    ),
    pdfColumn(
      [
        pdfText('Invoice {{invoiceNumber}}', { bold: true, alignment: 'right' }),
        pdfText('Issue date: {{issueDate}}', { fontSize: 9, color: '#64748b', alignment: 'right' }),
      ],
      { width: 165 },
    ),
  ]),
  footer: pdfText('Page {{pageNumber}} of {{pageCount}}', {
    alignment: 'right',
    fontSize: 8,
    color: '#94a3b8',
  }),
  body: [
    pdfSpacer(16),
    pdfHeading('Invoice', 1),
    pdfSpacer(12),
    pdfRow([
      pdfColumn(
        [
          pdfText('BILL TO', { bold: true, fontSize: 9, color: '#2c5f5d' }),
          pdfText('{{clientName}}', { bold: true }),
          pdfText('{{clientAddress}}', { fontSize: 9, color: '#64748b' }),
        ],
        { width: 300 },
      ),
      pdfColumn(
        [
          pdfText('PAYMENT DUE', { bold: true, fontSize: 9, color: '#2c5f5d', alignment: 'right' }),
          pdfText('{{dueDate}}', { alignment: 'right' }),
        ],
        { width: 215 },
      ),
    ]),
    pdfSpacer(16),
    pdfTable('items', {
      columns: [
        { header: 'Description', path: 'description' },
        { header: 'Qty', path: 'quantity', width: 50 },
        { header: 'Unit price', path: 'unitPrice', width: 70 },
        { header: 'Total', path: 'total', width: 70 },
      ],
    }),
    pdfSpacer(12),
    pdfRow([
      pdfColumn([], { width: 300 }),
      pdfColumn(
        [
          pdfRow([pdfText('Subtotal', { fontSize: 9 }), pdfText('{{subtotal}}', { fontSize: 9, alignment: 'right' })]),
          pdfRow([
            pdfText('Tax ({{taxRate}}%)', { fontSize: 9 }),
            pdfText('{{taxAmount}}', { fontSize: 9, alignment: 'right' }),
          ]),
          pdfRow([
            pdfText('Total', { bold: true, fontSize: 13 }),
            pdfText('{{total}}', { bold: true, fontSize: 13, alignment: 'right' }),
          ]),
        ],
        { width: 215 },
      ),
    ]),
  ],
};
