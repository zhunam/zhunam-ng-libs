# Changelog

All notable changes to `@zhunam/form-builder` are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/), versioning follows [SemVer](https://semver.org/).

## [Unreleased]

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
