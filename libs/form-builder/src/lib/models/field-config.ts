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
 * A single selectable choice for `select` and `radio` fields.
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

  /**
   * Short helper text shown below this specific option, for a `radio`
   * field (has no visible effect for `select`, native `<option>`
   * elements have nowhere to render it). Shown whenever set, referenced
   * by that option's own `aria-describedby`, independent of the
   * field-level `hint`/error.
   * @example
   * options: [
   *   { value: 'personal', label: 'Personal', description: 'For individual use' },
   *   { value: 'business', label: 'Business', description: 'For teams and invoicing' },
   * ]
   */
  description?: string;

  /**
   * Icon shown next to this option's label, for a `radio` field
   * rendered with `appearance: 'segmented'` (has no visible effect on
   * a plain vertical radio list or on `select`). Rendered as the text
   * content of a decorative `.fb-option-icon` span, meant for an
   * icon-font system that renders ligatures (e.g. Material Symbols),
   * never as a CSS class or an `<svg>`; `FormBuilder` never ships an
   * icon library of its own.
   * @example
   * options: [
   *   { value: 'card', label: 'Card', icon: 'credit_card' },
   *   { value: 'cash', label: 'Cash', icon: 'payments' },
   * ]
   */
  icon?: string;
}

/**
 * Purely visual variant for a field's control. Only ever changes how
 * one specific `type` renders; every other `type` ignores it entirely,
 * same as `default` (the default) does:
 * - `'switch'`: only affects `type: 'checkbox'`. Renders as a
 *   track-and-thumb toggle instead of a native checkbox box, with
 *   `role="switch"` added to the underlying input (absent for
 *   `'default'`).
 * - `'segmented'`: only affects `type: 'radio'`. Renders its options as
 *   a row of pill buttons instead of a vertical list, each able to show
 *   a `FieldOption.icon` next to its label.
 *
 * A real `<input type="checkbox">`/`<input type="radio">` still backs
 * either variant, visually hidden but focusable, clickable via its
 * `<label>`, and fully native for validation, keyboard, and screen
 * readers, only its own visible box is replaced by a sibling element
 * that reflects `:checked` through CSS, no state duplicated in
 * TypeScript.
 */
export type FieldAppearance = 'default' | 'switch' | 'segmented';

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
   * Regex pattern as a string (never a RegExp object, keeps config
   * serializable). Validated internally against a length limit and a
   * catastrophic-backtracking heuristic before use; throws if rejected.
   * This is a heuristic, not a mathematical guarantee. Never accept
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
   * Choices available for `select` and `radio` fields.
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

  /**
   * How many grid columns this field spans, when the component's
   * `columns` input is 2 or more. Has no effect at 1 column (the
   * default) or below the mobile breakpoint, where every field always
   * spans the full row.
   * @default 1
   */
  colSpan?: 1 | 2;

  /**
   * Renders the control disabled from the start and excludes it from
   * native validation, matching Angular's own disabled-control
   * semantics. Still included in the object `formSubmit` emits
   * (`FormBuilder` reads the raw form value, not the disabled-excluding
   * one); useful for a read-only field seeded via `defaultValue`.
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether a `type: 'password'` field renders a show/hide toggle
   * button next to its control. Has no effect on any other field type.
   * @default true
   */
  showPasswordToggle?: boolean;

  /**
   * Purely visual variant for this field's control. A flat optional
   * field rather than a discriminated union tying it to a specific
   * `type`, the same "optional, only relevant for one type" pattern
   * already used by `showPasswordToggle`: setting it on a `type` it
   * doesn't apply to (e.g. `appearance: 'switch'` on a `type: 'text'`
   * field) is simply ignored, not a compile error or a runtime warning.
   * See `FieldAppearance` for which `type` each value affects.
   * @default 'default'
   * @example
   * { key: 'subscribe', label: 'Subscribe', type: 'checkbox', appearance: 'switch' }
   */
  appearance?: FieldAppearance;

  /**
   * Short helper text shown below the field, whenever there's no
   * active error: an active error (`activeErrorFor(field)`) replaces
   * it visually, and `aria-describedby` follows the same rule, always
   * pointing at whichever one is currently shown, never both at once.
   * @example
   * { key: 'password', label: 'Password', type: 'password', hint: 'At least 8 characters' }
   */
  hint?: string;

  /**
   * Applies the native HTML `readonly` attribute, for `type`
   * `text`/`number`/`email`/`password`/`date`/`textarea` only: the
   * value stays visible and the field keeps participating in
   * validation exactly as before (a `required` field left empty is
   * still invalid, even while `readonly`), only direct user editing is
   * blocked. The underlying `FormControl` stays enabled, unlike
   * `disabled`, `buildFormGroup()` needs no special case for it.
   *
   * Has no effect at all on `select`, `radio`, or `checkbox`: the
   * `readonly` HTML attribute doesn't apply to those elements natively
   * (confirmed against the HTML specification, not simulated with any
   * workaround here). Setting it on one of those types is simply
   * ignored.
   * @default false
   * @example
   * { key: 'referenceCode', label: 'Reference code', type: 'text', readonly: true, defaultValue: 'REF-2026-001' }
   */
  readonly?: boolean;

  /**
   * Native HTML `autocomplete` attribute, passed through as-is to the
   * underlying control for `type` `text`/`email`/`password`/`number`/
   * `date`/`textarea`/`select`. Any value the HTML specification
   * accepts works (not validated here), typically one of the
   * standard autofill tokens.
   *
   * Has no effect on `checkbox` or `radio`: those render one native
   * input per option (or a single checkbox), where `autocomplete`
   * has no meaningful browser autofill behavior, so it's omitted
   * there on purpose rather than bound and silently ignored by the
   * browser.
   * @example
   * { key: 'email', label: 'Email', type: 'email', autocomplete: 'email' }
   * { key: 'username', label: 'Username', type: 'text', autocomplete: 'username' }
   * { key: 'fullName', label: 'Full name', type: 'text', autocomplete: 'name' }
   * { key: 'password', label: 'Password', type: 'password', autocomplete: 'current-password' }
   * { key: 'newPassword', label: 'New password', type: 'password', autocomplete: 'new-password' }
   */
  autocomplete?: string;
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
