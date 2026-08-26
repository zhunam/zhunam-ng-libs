/**
 * Page margins, in points. Any side left unset falls back to the
 * compiler's default page margin for that side (defined when the main
 * template compiler task lands).
 */
export interface PdfMargins {
  /**
   * Top margin, in points.
   */
  top?: number;

  /**
   * Bottom margin, in points.
   */
  bottom?: number;

  /**
   * Left margin, in points.
   */
  left?: number;

  /**
   * Right margin, in points.
   */
  right?: number;
}

/**
 * Text styling options accepted by `pdfText()` and `pdfHeading()`.
 */
export interface PdfTextOptions {
  /**
   * Renders the text in bold.
   * @default false
   */
  bold?: boolean;

  /**
   * Renders the text in italics.
   * @default false
   */
  italic?: boolean;

  /**
   * Font size, in points.
   */
  fontSize?: number;

  /**
   * Text color, as any CSS-compatible color string (e.g. `'#333333'`).
   */
  color?: string;

  /**
   * Horizontal text alignment.
   * @default 'left'
   */
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

/**
 * Layout options accepted by `pdfColumn()` and `pdfRow()`.
 */
export interface PdfLayoutOptions {
  /**
   * Fixed width, in points. Falls back to an even split among sibling
   * blocks when omitted.
   */
  width?: number;

  /**
   * Space between each child block, in points.
   * @default 0
   */
  gap?: number;
}

/**
 * A single line, paragraph, or heading of text.
 */
export interface PdfTextBlock {
  readonly type: 'text';

  /**
   * Text content. May contain `{{path}}` placeholders resolved against
   * the template's data object; see `PdfTemplate` for the limitations
   * of that path.
   */
  content: string;

  /**
   * Styling applied to this block's text.
   */
  options?: PdfTextOptions;
}

/**
 * A vertical group of blocks, laid out as one column.
 */
export interface PdfColumnBlock {
  readonly type: 'column';

  /**
   * Blocks stacked vertically inside this column.
   */
  children: PdfBlock[];

  /**
   * Layout options for this column.
   */
  options?: PdfLayoutOptions;
}

/**
 * A horizontal group of blocks, laid out side by side as one row.
 */
export interface PdfRowBlock {
  readonly type: 'row';

  /**
   * Blocks placed side by side inside this row.
   */
  children: PdfBlock[];

  /**
   * Layout options for this row.
   */
  options?: PdfLayoutOptions;
}

/**
 * A single column of a `PdfTableBlock`.
 */
export interface PdfTableColumn {
  /**
   * Text shown in this column's header cell.
   */
  header: string;

  /**
   * Path read from each row object to fill this column's cells. Not
   * validated against the row's shape at compile time; see
   * `PdfTemplate` for details on this limitation.
   */
  path: string;

  /**
   * Column width, in points. Falls back to an even split among columns
   * when omitted.
   */
  width?: number;
}

/**
 * A simple table, without merged cells or nested layouts.
 */
export interface PdfTableBlock {
  readonly type: 'table';

  /**
   * Path read from the template's data object to obtain the array of
   * row objects. Not validated against the data's shape at compile
   * time; see `PdfTemplate` for details on this limitation.
   */
  rowsPath: string;

  /**
   * Columns rendered, in order, from left to right.
   */
  columns: PdfTableColumn[];
}

/**
 * A single image.
 */
export interface PdfImageBlock {
  readonly type: 'image';

  /**
   * Path read from the template's data object to obtain the image
   * source. Not validated against the data's shape at compile time;
   * see `PdfTemplate` for details on this limitation.
   */
  srcPath: string;

  /**
   * Rendered width, in points. Falls back to the image's natural size
   * when omitted.
   */
  width?: number;
}

/**
 * Fixed vertical whitespace between blocks.
 */
export interface PdfSpacerBlock {
  readonly type: 'spacer';

  /**
   * Height of the empty space, in points.
   */
  height: number;
}

/**
 * Forces the content that follows onto a new page.
 */
export interface PdfPageBreakBlock {
  readonly type: 'pageBreak';
}

/**
 * Any block that can appear in a `PdfTemplate`'s header, footer, or body.
 */
export type PdfBlock =
  | PdfTextBlock
  | PdfColumnBlock
  | PdfRowBlock
  | PdfTableBlock
  | PdfImageBlock
  | PdfSpacerBlock
  | PdfPageBreakBlock;

/**
 * Declarative description of a PDF document: page setup plus a tree of
 * `PdfBlock`s for the header, footer, and body. Compiled against a data
 * object by `generatePdf()`.
 *
 * Every path-like field across `PdfBlock` (`PdfTextBlock.content`,
 * `PdfTableBlock.rowsPath`, `PdfTableColumn.path`, `PdfImageBlock.srcPath`)
 * is a plain `string` in v1, read at runtime against whatever data object
 * is passed to `generatePdf()`; a typo in a path only surfaces then, as a
 * missing value. `T` is planned to be added to this interface in v1.1,
 * together with a `Path<T>` type that checks those strings against a real
 * data shape at compile time, alongside a matching `generatePdf<T>()`.
 */
export interface PdfTemplate {
  /**
   * Physical page size.
   * @default 'A4'
   */
  pageSize?: 'A4' | 'LETTER';

  /**
   * Page margins.
   */
  margins?: PdfMargins;

  /**
   * Block rendered at the top of every page.
   */
  header?: PdfBlock;

  /**
   * Block rendered at the bottom of every page. Supports the reserved
   * `{{pageNumber}}` and `{{pageCount}}` placeholders, in addition to
   * any path resolved against `T`.
   */
  footer?: PdfBlock;

  /**
   * Ordered blocks that make up the document's main content.
   */
  body: PdfBlock[];
}
