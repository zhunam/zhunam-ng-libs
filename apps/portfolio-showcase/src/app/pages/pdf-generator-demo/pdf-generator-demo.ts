import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PdfPreview } from '@zhunam/pdf-generator';
import {
  DemoInvoiceItem,
  initialInvoiceData,
  invoiceTemplate,
  TAX_RATE_PERCENT,
} from '../../shared/mock-invoice-template';
import { LibraryPageShell } from '../../shared/library-page-shell/library-page-shell';
import { PackageInfoCard } from '../../shared/package-info-card/package-info-card';
import { pdfGeneratorLibrary } from '../../shared/libraries';

@Component({
  selector: 'app-pdf-generator-demo',
  imports: [PdfPreview, RouterLink, LibraryPageShell, PackageInfoCard],
  templateUrl: './pdf-generator-demo.html',
  styleUrl: './pdf-generator-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfGeneratorDemo {
  protected readonly library = pdfGeneratorLibrary;
  protected readonly invoiceTemplate = invoiceTemplate;

  protected readonly clientName = signal(initialInvoiceData.clientName);
  protected readonly clientAddress = signal(initialInvoiceData.clientAddress);
  protected readonly items = signal<DemoInvoiceItem[]>(initialInvoiceData.items);

  // Business letterhead info and invoice metadata stay fixed for this
  // demo (see mock-invoice-template.ts), only client + items are wired
  // to editable signals; editing them here would need its own form
  // section for no real payoff, the point of this demo is generatePdf()
  // reacting to data changes, not modeling a full invoice editor.
  //
  // `PdfTableColumn.path` and `{{path}}` placeholders only ever read a
  // value, never compute one (no expression engine, by design): each
  // item's own `total`, and the subtotal/tax/total trio below, are all
  // derived here, once per edit, before this object ever reaches
  // <lib-pdf-preview>'s [data].
  protected readonly editableData = computed(() => {
    const items = this.items().map((item) => ({ ...item, total: item.quantity * item.unitPrice }));
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = (subtotal * TAX_RATE_PERCENT) / 100;

    return {
      businessName: initialInvoiceData.businessName,
      businessAddress: initialInvoiceData.businessAddress,
      invoiceNumber: initialInvoiceData.invoiceNumber,
      issueDate: initialInvoiceData.issueDate,
      dueDate: initialInvoiceData.dueDate,
      clientName: this.clientName(),
      clientAddress: this.clientAddress(),
      items,
      subtotal: subtotal.toFixed(2),
      taxRate: TAX_RATE_PERCENT,
      taxAmount: taxAmount.toFixed(2),
      total: (subtotal + taxAmount).toFixed(2),
    };
  });

  protected readonly dataJson = computed(() => JSON.stringify(this.editableData(), null, 2));

  // `invoiceTemplate` never changes, so this is computed once, not a
  // signal. The embedded logo's data: URI (PdfImageBlock.srcPath) is
  // shortened for display only, the full value still reaches
  // generatePdf() unchanged via `invoiceTemplate` itself: a ~130-char
  // base64 blob inline in this read-only panel is noise, not signal.
  protected readonly templateJson = JSON.stringify(
    invoiceTemplate,
    (key, value: unknown) =>
      key === 'srcPath' && typeof value === 'string' && value.startsWith('data:')
        ? `${value.slice(0, 40)}… (truncated for display)`
        : value,
    2,
  );

  protected readonly usageSnippet = `import { PdfPreview } from '@zhunam/pdf-generator';

<lib-pdf-preview
  [template]="invoiceTemplate"
  [data]="editableData()"
  (generationError)="onGenerationError($event)"
/>`;

  protected addItem(): void {
    this.items.update((items) => [...items, { description: '', quantity: 1, unitPrice: 0 }]);
  }

  protected removeItem(index: number): void {
    this.items.update((items) => items.filter((_, i) => i !== index));
  }

  protected updateItem(index: number, patch: Partial<DemoInvoiceItem>): void {
    this.items.update((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  protected onGenerationError(error: Error): void {
    console.error('pdf-generator demo: generationError', error);
  }
}
