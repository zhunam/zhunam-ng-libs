import type { PdfBlock, PdfTableColumn, PdfTemplate } from '../models/pdf-block';
import { resolveTemplateString } from './resolve-path';
import { resolveImageSource } from './resolve-image-source';
import type { Column, Content, TDocumentDefinitions } from './pdfmake-types';
import { resolveTableRows } from './resolve-table-rows';

/**
 * The page margin, in points, used for any side of `PdfMargins` left
 * unset. Matches pdfmake's own built-in default (`pageMargins: 40`
 * uniformly), so a template that never sets `margins` at all renders
 * identically to one that explicitly sets every side to this value.
 */
const DEFAULT_PAGE_MARGIN = 40;

/**
 * A block's own layout width, read only from `PdfColumnBlock` and
 * `PdfRowBlock` (the only block types with a `PdfLayoutOptions.width`);
 * every other block type has no such concept and resolves to
 * `undefined`. Used when compiling a `PdfRowBlock`'s children: each
 * child's own width, if it set one, becomes that child's column width
 * in pdfmake's `columns` array.
 */
function getBlockWidth(block: PdfBlock): number | undefined {
  return block.type === 'column' || block.type === 'row' ? block.options?.width : undefined;
}

/**
 * Derives pdfmake's `Table.widths` array from `columns`, or `undefined`
 * when no column sets its own `width` at all.
 *
 * `undefined` here means the `widths` key is never added to the
 * compiled table at all, not that it's added with an all-`'auto'`
 * array: confirmed empirically against the real pdfmake engine that an
 * explicit `widths: ['auto', 'auto', ...]` array renders identically to
 * omitting the key outright (pdfmake's own default, per
 * `@types/pdfmake`'s docs, is already `'auto'`), so this preserves
 * exactly what every table rendered before this function existed: no
 * column ever set a fixed width, so `widths` was never added.
 */
function resolveTableWidths(columns: PdfTableColumn[]): Array<number | 'auto'> | undefined {
  if (columns.every((column) => column.width === undefined)) {
    return undefined;
  }

  return columns.map((column) => column.width ?? 'auto');
}

/**
 * Compiles a single `PdfBlock` into pdfmake `Content`, resolving any
 * `{{path}}` placeholder against `data` along the way (via
 * `resolveTemplateString()`/`resolveTableRows()`/`resolveImageSource()`,
 * reused as-is, their security behavior is not reimplemented here).
 *
 * `PdfLayoutOptions.gap` (on `PdfColumnBlock`/`PdfRowBlock`) is not
 * consumed here yet: pdfmake has no native per-item vertical gap for a
 * `stack`, and applying it manually (e.g. via `marginBottom` on every
 * child but the last) is a real design decision on its own, deferred
 * rather than guessed at in this pass.
 *
 * @param allowedRemoteHosts Forwarded to `resolveImageSource()` for any
 * `PdfImageBlock` encountered, directly or nested inside a column/row.
 * @param images Mutated in place: a remote-URL image contributes a
 * `img_N` entry here instead of being inlined directly. Confirmed
 * empirically that pdfmake's browser bundle only actually fetches a
 * remote URL when it's referenced this way, through
 * `TDocumentDefinitions.images` plus a named `image` reference; passing
 * the raw URL straight as `image` (what a first pass at this looked
 * like) never triggers a fetch at all, pdfmake treats it as a vfs
 * lookup key instead and fails with "not found in virtual file system".
 * A `data:` URI is never added here, it's always inlined directly, data
 * URIs work as a direct `image` value with no indirection needed.
 */
function compileBlock(
  block: PdfBlock,
  data: unknown,
  allowedRemoteHosts: string[],
  images: Record<string, string>,
): Content {
  switch (block.type) {
    case 'text': {
      const { bold, italic, fontSize, color, alignment } = block.options ?? {};
      return {
        text: resolveTemplateString(block.content, data),
        bold,
        italics: italic,
        fontSize,
        color,
        alignment,
      };
    }

    case 'column':
      return {
        stack: block.children.map((child) => compileBlock(child, data, allowedRemoteHosts, images)),
      };

    case 'row':
      return {
        // pdfmake's own types model `Column` as `Content & ColumnProperties`,
        // but each `Content` union member also forbids every other member's
        // properties (`ForbidOtherElementProperties`), so a generic,
        // not-yet-narrowed `Content` intersected with `{ width }` doesn't
        // structurally satisfy `Column` even though attaching a width to
        // any content, whichever shape it is, is exactly what pdfmake
        // expects here at runtime. `Column` itself also isn't part of this
        // package's public export surface to import directly. The double
        // cast is a deliberate, narrow escape hatch for that specific type
        // modeling gap, not a workaround for a real bug.
        columns: block.children.map((child) => {
          const compiled = compileBlock(
            child,
            data,
            allowedRemoteHosts,
            images,
          ) as unknown as Record<string, unknown>;
          return { ...compiled, width: getBlockWidth(child) } as unknown as Column;
        }),
      };

    case 'table': {
      const { headers, rows } = resolveTableRows(block, data);
      const widths = resolveTableWidths(block.columns);
      return widths
        ? { table: { body: [headers, ...rows], widths } }
        : { table: { body: [headers, ...rows] } };
    }

    case 'spacer':
      return { text: '', marginBottom: block.height };

    case 'pageBreak':
      return { text: '', pageBreak: 'after' };

    case 'image': {
      const resolvedSrc = resolveImageSource(block.srcPath, data, allowedRemoteHosts);

      if (resolvedSrc.startsWith('data:')) {
        return { image: resolvedSrc, width: block.width };
      }

      const key = `img_${Object.keys(images).length}`;
      images[key] = resolvedSrc;
      return { image: key, width: block.width };
    }
  }
}

/**
 * Compiles a `PdfTemplate`'s `header` or `footer` block into pdfmake's
 * dynamic-content function shape, or returns `undefined` when there's no
 * block to compile.
 *
 * The reserved `pageNumber`/`pageCount` placeholders always win over any
 * same-named key already present in `data`: they're added to the
 * resolution context after spreading `data`, and a later object-literal
 * property always overrides an earlier one with the same key. A
 * template's header/footer can otherwise read any path resolved against
 * `data`, same as the rest of the template.
 */
function compileHeaderFooter(
  block: PdfBlock | undefined,
  data: unknown,
  allowedRemoteHosts: string[],
  images: Record<string, string>,
): ((currentPage: number, pageCount: number) => Content) | undefined {
  if (!block) {
    return undefined;
  }

  return (currentPage, pageCount) => {
    const context = { ...(data as Record<string, unknown>), pageNumber: currentPage, pageCount };
    return compileBlock(block, context, allowedRemoteHosts, images);
  };
}

/**
 * Compiles a `PdfTemplate` and a data object into a pdfmake
 * `TDocumentDefinitions`, ready to pass to `createPdf()`.
 *
 * @param allowedRemoteHosts Forwarded to `resolveImageSource()` for
 * every `PdfImageBlock` in the template (body, header, and footer
 * alike). Defaults to `[]`, matching `PdfGenerateOptions`'s own
 * default of denying every remote image.
 */
export function compileTemplate(
  template: PdfTemplate,
  data: unknown,
  allowedRemoteHosts: string[] = [],
): TDocumentDefinitions {
  const { pageSize = 'A4', margins, header, footer, body } = template;
  const images: Record<string, string> = {};

  const content = body.map((block) => compileBlock(block, data, allowedRemoteHosts, images));
  const compiledHeader = compileHeaderFooter(header, data, allowedRemoteHosts, images);
  const compiledFooter = compileHeaderFooter(footer, data, allowedRemoteHosts, images);

  return {
    pageSize,
    pageMargins: margins
      ? [
          margins.left ?? DEFAULT_PAGE_MARGIN,
          margins.top ?? DEFAULT_PAGE_MARGIN,
          margins.right ?? DEFAULT_PAGE_MARGIN,
          margins.bottom ?? DEFAULT_PAGE_MARGIN,
        ]
      : undefined,
    header: compiledHeader,
    footer: compiledFooter,
    content,
    // Always the same `images` object reference, never conditionally
    // `undefined` based on whether it already has entries: header/footer
    // are functions pdfmake calls later, during actual page rendering,
    // not synchronously here, so a remote image referenced only inside a
    // header/footer wouldn't have been added yet at this point. Since
    // this is the same object by reference, a later mutation from inside
    // a header/footer call is still visible when pdfmake reads
    // `docDefinition.images` to resolve it. An empty `{}` for a template
    // with no images at all is harmless, functionally identical to
    // `undefined` for pdfmake's own resolution.
    images,
    defaultStyle: { font: 'Roboto' },
  };
}
