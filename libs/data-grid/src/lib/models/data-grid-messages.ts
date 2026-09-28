/**
 * Translatable strings `DataGrid` renders. Every member is a function,
 * called fresh on every render, so a message that reads a signal (e.g. a
 * language switcher) updates live without recreating the component.
 */
export interface DataGridMessages {
  /**
   * Label of the "previous page" pagination button.
   */
  previous(): string;

  /**
   * Label of the "next page" pagination button.
   */
  next(): string;

  /**
   * Status text between the pagination buttons.
   * @param current Current page number, 1-based.
   * @param total Total number of pages.
   */
  pageStatus(current: number, total: number): string;

  /**
   * Accessible label for the "select all rows on this page" checkbox in
   * the header, shown when `selectable` is `true`.
   */
  selectAll(): string;

  /**
   * Accessible label for an individual row's selection checkbox, shown
   * when `selectable` is `true`. A single generic label rather than one
   * naming the row: `DataGrid<T>` has no field designated as a row's
   * display name (only `rowKey()`, which returns an opaque identifier,
   * not necessarily human-readable), so there's no generic way to build
   * a per-row label. The surrounding row content is still announced as
   * part of normal table navigation.
   */
  selectRow(): string;

  /**
   * Default text shown in place of the rows while `loading` is `true`,
   * when no `loadingTemplate` is provided.
   */
  loading(): string;

  /**
   * Default text shown in place of the rows when there's nothing to
   * display (`loading` is `false` and there are no rows on the current
   * page), when no `emptyTemplate` is provided.
   */
  empty(): string;
}

/**
 * Default English messages. Used when no `DATA_GRID_MESSAGES` provider is
 * registered.
 */
export const DATA_GRID_MESSAGES_EN: DataGridMessages = {
  previous: () => 'Previous',
  next: () => 'Next',
  pageStatus: (current, total) => `Page ${current} of ${total}`,
  selectAll: () => 'Select all rows on this page',
  selectRow: () => 'Select row',
  loading: () => 'Loading...',
  empty: () => 'No data to display',
};

/**
 * Spanish preset, ready to pass to `provideDataGridMessages()`.
 * @example
 * providers: [provideDataGridMessages(DATA_GRID_MESSAGES_ES)]
 */
export const DATA_GRID_MESSAGES_ES: DataGridMessages = {
  previous: () => 'Anterior',
  next: () => 'Siguiente',
  pageStatus: (current, total) => `Página ${current} de ${total}`,
  selectAll: () => 'Seleccionar todas las filas de esta página',
  selectRow: () => 'Seleccionar fila',
  loading: () => 'Cargando...',
  empty: () => 'No hay datos para mostrar',
};
