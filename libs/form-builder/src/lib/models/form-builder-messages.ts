/**
 * Translatable strings `FormBuilder` renders: validation messages and the
 * submit button label. Every member is a function, called fresh on every
 * render, so a message that reads a signal (e.g. a language switcher)
 * updates live without recreating the component.
 */
export interface FormBuilderMessages {
  /**
   * Shown when a required field is empty.
   */
  required(): string;

  /**
   * Shown when an `email` field doesn't hold a well-formed address.
   */
  email(): string;

  /**
   * Shown when a numeric field is below its configured `min`.
   * @param min The minimum allowed value, from Angular's own validation
   * error (`control.errors['min'].min`).
   */
  min(min: number): string;

  /**
   * Shown when a numeric field is above its configured `max`.
   * @param max The maximum allowed value, from Angular's own validation
   * error (`control.errors['max'].max`).
   */
  max(max: number): string;

  /**
   * Shown when a field's value is shorter than its configured `minLength`.
   * @param requiredLength The minimum required length, from Angular's own
   * validation error (`control.errors['minlength'].requiredLength`).
   */
  minLength(requiredLength: number): string;

  /**
   * Shown when a field's value is longer than its configured `maxLength`.
   * @param requiredLength The maximum required length, from Angular's own
   * validation error (`control.errors['maxlength'].requiredLength`).
   */
  maxLength(requiredLength: number): string;

  /**
   * Shown when a field's value doesn't match its configured `pattern`.
   */
  pattern(): string;

  /**
   * Label of the submit button.
   */
  submit(): string;

  /**
   * `aria-label` of the password visibility toggle when the field's
   * value is currently hidden (about to reveal it).
   */
  showPassword(): string;

  /**
   * `aria-label` of the password visibility toggle when the field's
   * value is currently shown (about to hide it).
   */
  hidePassword(): string;
}

/**
 * Default English messages. Used when no `FORM_BUILDER_MESSAGES` provider
 * is registered.
 */
export const FORM_BUILDER_MESSAGES_EN: FormBuilderMessages = {
  required: () => 'This field is required.',
  email: () => 'Enter a valid email address.',
  min: (min) => `The value must be at least ${min}.`,
  max: (max) => `The value must be at most ${max}.`,
  minLength: (requiredLength) => `Must be at least ${requiredLength} characters.`,
  maxLength: (requiredLength) => `Must be at most ${requiredLength} characters.`,
  pattern: () => 'The format is not valid.',
  submit: () => 'Submit',
  showPassword: () => 'Show password',
  hidePassword: () => 'Hide password',
};

/**
 * Spanish preset, ready to pass to `provideFormBuilderMessages()`.
 * @example
 * providers: [provideFormBuilderMessages(FORM_BUILDER_MESSAGES_ES)]
 */
export const FORM_BUILDER_MESSAGES_ES: FormBuilderMessages = {
  required: () => 'Este campo es obligatorio.',
  email: () => 'El email no es válido.',
  min: (min) => `El valor debe ser como mínimo ${min}.`,
  max: (max) => `El valor debe ser como máximo ${max}.`,
  minLength: (requiredLength) => `Debe tener al menos ${requiredLength} caracteres.`,
  maxLength: (requiredLength) => `Debe tener como máximo ${requiredLength} caracteres.`,
  pattern: () => 'El formato no es válido.',
  submit: () => 'Enviar',
  showPassword: () => 'Mostrar contraseña',
  hidePassword: () => 'Ocultar contraseña',
};
