# Changelog

All notable changes to `@zhunam/form-builder` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

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
