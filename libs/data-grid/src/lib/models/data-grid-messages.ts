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
}

/**
 * Default English messages. Used when no `DATA_GRID_MESSAGES` provider is
 * registered.
 */
export const DATA_GRID_MESSAGES_EN: DataGridMessages = {
  previous: () => 'Previous',
  next: () => 'Next',
  pageStatus: (current, total) => `Page ${current} of ${total}`,
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
};
