import { NgModule } from '@angular/core';
import { PdfPreview } from './pdf-preview';

/**
 * NgModule wrapper for `PdfPreview`, for consumers still on a classic
 * NgModule architecture. `PdfPreview` is a standalone component;
 * importing it directly (`imports: [PdfPreview]`) is still the
 * recommended way to consume this library. Use this module only if
 * your app doesn't use standalone components yet.
 *
 * @example
 * @NgModule({
 *   imports: [PdfPreviewModule],
 * })
 * export class InvoicePageModule {}
 */
@NgModule({
  imports: [PdfPreview],
  exports: [PdfPreview],
})
export class PdfPreviewModule {}
