# Changelog

All notable changes to `@zhunam/form-builder` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

## [3.1.0] - 2026-09-28

### Added
- `FieldConfig.appearance` (`'default' | 'switch' | 'segmented'`,
  default `'default'`): a purely visual variant. `'switch'` renders a
  `type: 'checkbox'` field as a track-and-thumb toggle instead of a
  native checkbox box; `'segmented'` renders a `type: 'radio'` field's
  options as a row of pills instead of a vertical list. A real
  `<input type="checkbox">`/`<input type="radio">` still backs either
  variant, visually hidden but focusable, clickable via its label, and
  fully native for validation, keyboard, and screen readers. See the
  README's "Switch and segmented appearance" section.
- `FieldConfig.hint`: short helper text shown below a field whenever
  there's no active error. `aria-describedby` points at the hint or
  the error, whichever is currently shown, never both at once. See the
  README's "Field hints and option descriptions" section.
- `FieldOption.description`: short helper text shown below one
  specific `radio` option, with its own id and `aria-describedby`,
  independent of the field-level hint or error.
- `FieldConfig.readonly` (default `false`): applies the native HTML
  `readonly` attribute for `text`/`number`/`email`/`password`/`date`/
  `textarea` fields. The `FormControl` stays enabled and validation
  keeps running exactly as before, only direct editing is blocked. No
  effect on `select`/`radio`/`checkbox`, the `readonly` attribute
  doesn't apply to those natively. See the README's "Read-only fields"
  section.
- `--zhunam-segmented-bg` custom property (default `#fff`): inactive
  pill background for a `'segmented'` radio group. The active pill
  reuses the existing `--zhunam-primary`/`--zhunam-primary-content`
  pair, the same colors the submit button already uses.

## [3.0.0] - 2026-09-28

### Added
- `submitLabel: input<string>`, `hideSubmit: input<boolean>` (default
  `false`), `loading: input<boolean>` (default `false`), and a public
  `submit()` method: a consumer can now trigger submission from its own
  UI (`hideSubmit`), customize the button's text, or disable it during
  an in-flight request. `submit()` runs the exact same logic the
  internal button does, guarded by `loading` either way.
- `--zhunam-submit-width` custom property (default `auto`): the submit
  button's width.
- Show/hide toggle on `type: 'password'` fields, on by default. New
  `FieldConfig.showPasswordToggle` (default `true`) disables it per
  field. New `FormBuilderMessages.showPassword()` / `hidePassword()`
  supply the toggle's `aria-label` in both states (English/Spanish
  presets included); the toggle also reflects its state via
  `aria-pressed`.
- `--zhunam-accent` custom property (default `var(--zhunam-primary)`):
  radio/checkbox accent color, independent from `--zhunam-primary`.
- `value: input<T>`: an external value patched into the current form
  (`patchValue` with `emitEvent: false`, so it never triggers
  `valueChange` in `'live'` mode) every time a new, non-`undefined`
  value is received, without rebuilding the form. Useful for a "swap"
  or "restore a draft" action that shouldn't reset fields the user
  already touched.

### Changed
- Rebuilding `fields()` (e.g. a wizard changing steps) no longer resets
  the value of a control whose key still exists in the new array back
  to its `defaultValue`: the current value is now carried forward. Only
  a control whose key disappears from the new `fields()` is dropped; a
  brand-new key still seeds from its own `defaultValue`. Existing
  consumers who relied on a `fields()` rebuild also resetting field
  values (uncommon, since `fields()` changing at runtime was documented
  as a wizard-style scenario, not a general reset mechanism) need to
  reset explicitly via `value` instead.
- **BREAKING**: default language of every validation message and the
  submit button label is now English instead of Spanish. Use
  `provideFormBuilderMessages(FORM_BUILDER_MESSAGES_ES)` to restore the
  previous text. A per-field `FieldValidatorConfig.errorMessages`
  override, when set, still takes precedence over this and is
  unaffected.
- **BREAKING**: validation messages for `min`/`max`/`minLength`/`maxLength`
  now include the real configured value (e.g. "Must be at least 3
  characters." instead of a generic "too short" sentence), read from
  Angular's own validation error object.
- **BREAKING**: `--zhunam-*` defaults are no longer declared on the
  component's own `:host`. A consumer stylesheet that already set one of
  these properties on an ancestor of `lib-form-builder` (e.g. `:root`)
  that is less specific than `:host` will now see that value actually
  apply, where it was silently overridden before: `:host`'s own
  declaration always won the cascade regardless of the ancestor rule's
  specificity. No default value changed.

### Added
- `FormBuilderMessages`, `FORM_BUILDER_MESSAGES` (`InjectionToken`),
  `provideFormBuilderMessages()`, `FORM_BUILDER_MESSAGES_EN`,
  `FORM_BUILDER_MESSAGES_ES`: translate every validation message and the
  submit button label. Every message is a function evaluated on render,
  so one that reads a signal updates live. Replaces the internal
  `DEFAULT_ERROR_MESSAGES` constant.
- `--zhunam-error-text` custom property (default `var(--zhunam-error)`):
  the error message's own text color, independent from `--zhunam-error`.

## [2.0.0] - 2026-09-17

### Added
- `--zhunam-primary-content` custom property (default `#fff`): the
  `.fb-submit` button text color now reads from this property instead
  of a hardcoded `color: #fff`, so a consumer who re-themes
  `--zhunam-primary` to a light color can keep the submit button's text
  readable.

### Changed
- **BREAKING**: every CSS custom property is renamed to the shared
  `--zhunam-*` namespace, unified across all `@zhunam/*` libraries so
  they use one consistent name per theming role instead of a
  library-specific prefix. No compatibility aliases are kept for the
  old names; update any stylesheet that sets one of them. `--fb-columns`
  is unaffected: it was never a themeable custom property, it's an
  internal channel the component uses to pass its `columns` input into
  CSS, and stays as-is.
- Every `var()` usage now carries an inline fallback matching its
  `:host` default, so the component degrades gracefully if that
  declaration is ever missing instead of resolving to an invalid value.

| Old name | New name |
| ------------------------- | -------------------------------- |
| `--fb-font-family`        | `--zhunam-font-family`           |
| `--fb-font-size`          | `--zhunam-font-size`             |
| `--fb-text-color`         | `--zhunam-text`                  |
| `--fb-label-color`        | `--zhunam-text-secondary`        |
| `--fb-border-color`       | `--zhunam-border`                |
| `--fb-error-color`        | `--zhunam-error`                 |
| `--fb-primary-color`      | `--zhunam-primary`               |
| `--fb-focus-color`        | `--zhunam-focus`                 |
| `--fb-border-radius`      | `--zhunam-radius`                |
| `--fb-spacing`            | `--zhunam-spacing`               |
| `--fb-control-padding-y`  | `--zhunam-form-control-padding-y`|
| `--fb-control-padding-x`  | `--zhunam-form-control-padding-x`|
| `--fb-transition-duration`| `--zhunam-transition-duration`   |
| `--fb-columns`            | _(unchanged, not a theming property)_ |

## [1.2.0] - 2026-09-13

### Added
- `mode: input<'submit' | 'live'>('submit')` and `valueChange:
  output<T>`: an opt-in live mode that emits the typed, valid form
  values continuously as the user edits, instead of only on submit.
  `formSubmit` keeps working exactly as before in both modes. Fully
  additive: with `mode` left at its default (`'submit'`, every existing
  consumer), behavior is unchanged, confirmed with an explicit
  regression test, not just "existing tests still pass." No new
  dependency: reuses `FormGroup.valueChanges`, already available
  through `@angular/forms`, an existing peer dependency.

## [1.1.0] - 2026-08-17

### Added
- `FormBuilderModule`: NgModule wrapper around the standalone
  `FormBuilder<T>` component (`imports: [FormBuilder]`,
  `exports: [FormBuilder]`), for consumers still on a classic NgModule
  architecture. Additive, no breaking change to the existing standalone
  contract; the generic `T` still infers correctly per usage from the
  bound `[fields]` input, verified against `strictTemplates`.

## [1.0.1] - 2026-08-08

### Fixed
- Corrected `license` field in package.json (was missing, causing npm to
  display "License: none" instead of MIT).

## [1.0.0] - 2026-08-08

### Added
- `FormBuilder<T>` standalone component: dynamic reactive forms from a
  declarative `FieldConfig<T>[]` array.
- Field types: text, number, email, password, textarea, select, radio,
  checkbox, date.
- Native per-field validation (required, min, max, minLength, maxLength,
  pattern, email) mapped to Angular's built-in Validators.
- Cross-field validation via `CrossFieldValidator<T>`: declarative,
  without exposing Angular's `ValidatorFn`/`AbstractControl`.
- Heuristic protection against catastrophic-backtracking (ReDoS) in
  `pattern`, via `assertSafePattern`.
- XSS-safe rendering: `label`, `placeholder`, `errorMessages`, and
  `FieldOption.label` are always rendered via interpolation, never
  `[innerHTML]`.
- Configurable grid layout via `columns` input and per-field `colSpan`.
- `serverErrors` input with auto-clearing when the field is edited.
- Per-field `disabled` support; `formSubmit` uses `getRawValue()` so
  disabled fields with a `defaultValue` are still included.
- Accessibility: `aria-invalid`/`aria-describedby` synced with visible
  error messages, `radiogroup` role with `aria-labelledby` for radio
  groups.
- `@angular/core` / `@angular/forms` compatibility:
  `^20.0.0 || ^21.0.0 || ^22.0.0`.

### Fixed
- Number fields now correctly coerce their value to `Number` on submit
  (previously emitted as a string due to Angular's ValueAccessor
  selector matching only static `type="number"`, not the dynamic
  binding used in this component).
