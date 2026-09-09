/**
 * Thrown when `CalendarStore.addEvent()`/`updateEvent()` would leave an
 * event with `end` before `start`. Exported so a consumer can catch this
 * specific misuse instead of a generic `Error`, same pattern as
 * `PdfTemplateValidationError` in `@zhunam/pdf-generator`.
 */
export class CalendarValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarValidationError';
  }
}
