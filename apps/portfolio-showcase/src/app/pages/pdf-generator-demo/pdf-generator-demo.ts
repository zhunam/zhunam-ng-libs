import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PdfPreview } from '@zhunam/pdf-generator';
import {
  DemoInvoiceItem,
  initialInvoiceData,
  invoiceTemplate,
} from '../../shared/mock-invoice-template';
import { libraries } from '../../shared/libraries';
import { injectCurrentUrl, sidebarLinkClasses } from '../../shared/library-sidebar';

@Component({
  selector: 'app-pdf-generator-demo',
  imports: [PdfPreview, RouterLink],
  templateUrl: './pdf-generator-demo.html',
  styleUrl: './pdf-generator-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfGeneratorDemo {
  protected readonly libraries = libraries;
  protected readonly currentUrl = injectCurrentUrl();
  protected readonly sidebarLinkClasses = sidebarLinkClasses;

  protected readonly invoiceTemplate = invoiceTemplate;

  protected readonly clientName = signal(initialInvoiceData.clientName);
  protected readonly items = signal<DemoInvoiceItem[]>(initialInvoiceData.items);

  // `PdfTableColumn.path` only ever reads a value, it never computes one
  // (no expression engine, by design): `total` is derived here, once per
  // edit, before this object ever reaches <lib-pdf-preview>'s [data].
  protected readonly editableData = computed(() => ({
    clientName: this.clientName(),
    items: this.items().map((item) => ({ ...item, total: item.quantity * item.unitPrice })),
  }));

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
