import type * as PdfMakeEngineModule from 'pdfmake/build/pdfmake.js';
import type { Content } from 'pdfmake/build/pdfmake.js';

export type { Content, Style, Table, TableCell, TCreatedPdf } from 'pdfmake/build/pdfmake.js';

/**
 * The full pdfmake engine surface (`createPdf`, `addVirtualFileSystem`,
 * etc.), typed from `pdfmake`'s own declarations.
 */
export type PdfMakeEngine = typeof PdfMakeEngineModule;

/**
 * `pdfmake`'s own type declarations don't re-export `TDocumentDefinitions`
 * or `TVirtualFileSystem` by name from its main entry point, they're only
 * used internally in `createPdf`'s and `addVirtualFileSystem`'s
 * signatures. Derived structurally from those signatures instead of an
 * import that doesn't exist.
 */
export type TDocumentDefinitions = Parameters<PdfMakeEngine['createPdf']>[0];
export type TVirtualFileSystem = Parameters<PdfMakeEngine['addVirtualFileSystem']>[0];

/**
 * `Column` (the element type of `ContentColumns.columns`) isn't part of
 * this package's public export surface either. Derived the same way, by
 * pulling the `ContentColumns` member out of the `Content` union via its
 * distinguishing `columns` property, then reading its element type.
 */
type ContentColumns = Extract<Content, { columns: unknown }>;
export type Column = ContentColumns['columns'][number];
