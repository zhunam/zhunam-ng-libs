/**
 * Supported input types a `FieldConfig` can render.
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date';

/**
 * A single selectable choice for `select`, `radio`, and `checkbox` fields.
 */
export interface FieldOption {
  /**
   * Value submitted when this option is selected.
   */
  value: string | number;

  /**
   * Text displayed to the user for this option.
   */
  label: string;
}

/**
 * Native Angular validation rules applied to a single field.
 */
export interface FieldValidatorConfig {
  /**
   * Whether the field must have a value.
   * @default false
   */
  required?: boolean;

  /**
   * Minimum numeric value allowed.
   */
  min?: number;

  /**
   * Maximum numeric value allowed.
   */
  max?: number;

  /**
   * Minimum string length allowed.
   */
  minLength?: number;

  /**
   * Maximum string length allowed.
   */
  maxLength?: number;

  /**
   * Regex pattern as a string (never a RegExp object — keeps config
   * serializable). Validated internally against a length limit and a
   * catastrophic-backtracking heuristic before use; throws if rejected.
   * This is a heuristic, not a mathematical guarantee — never accept
   * `pattern` values from a fully untrusted source without your own
   * review.
   */
  pattern?: string;

  /**
   * Whether the value must be a well-formed email address.
   * @default false
   */
  email?: boolean;

  /**
   * Custom error message per validator, shown instead of the built-in
   * default when that validator fails.
   */
  errorMessages?: Partial<
    Record<
      'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email',
      string
    >
  >;
}

/**
 * Declarative configuration for a single form field rendered by
 * `FormBuilder`.
 */
export interface FieldConfig<T> {
  /**
   * Property of `T` this field reads and writes its value from.
   */
  key: keyof T;

  /**
   * Text displayed as the field's label.
   */
  label: string;

  /**
   * Input type this field renders as.
   */
  type: FieldType;

  /**
   * Placeholder text shown when the field is empty.
   */
  placeholder?: string;

  /**
   * Choices available for `select`, `radio`, and `checkbox` fields.
   */
  options?: FieldOption[];

  /**
   * Native Angular validation rules applied to this field.
   */
  validators?: FieldValidatorConfig;

  /**
   * Initial value assigned to the field before user interaction.
   */
  defaultValue?: T[keyof T];
}

/**
 * Declarative form-level validator that checks values across multiple
 * fields (e.g. confirming a password), without exposing Angular's
 * `ValidatorFn`/`AbstractControl` to the consumer.
 */
export interface CrossFieldValidator<T> {
  /**
   * Runs the cross-field check against the current form value.
   * @returns A map of error keys to messages when invalid, or `null`
   * when valid.
   */
  validate: (value: Partial<T>) => Record<string, string> | null;
}
