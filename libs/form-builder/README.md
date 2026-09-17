# @zhunam/form-builder

A declarative Angular form renderer. Reactive validation, cross-field
checks, and server error handling from a plain config array, no CSS
framework dependency, no runtime dependencies beyond Angular itself.

## Installation

```bash
npm install @zhunam/form-builder
```

## Usage

```typescript
import { FormBuilder, FieldConfig } from '@zhunam/form-builder';

interface User { name: string; email: string; }
const fields: FieldConfig<User>[] = [
  { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
  { key: 'email', label: 'Email', type: 'email', validators: { required: true, email: true } },
];
```

```html
<lib-form-builder [fields]="fields" (formSubmit)="onSubmit($event)" />
```

### Live mode

For a calculator-style form (no submit action, values used as you type):

```html
<lib-form-builder [fields]="fields" mode="live" (valueChange)="onValueChange($event)" />
```

`formSubmit` stays available in `'live'` mode too; most `'live'` consumers just won't use it.

## API

### `FormBuilder<T>`

| Name                  | Type                                        | Default      | Description                                                                          |
| --------------------- | -------------------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| `fields`               | `input.required<FieldConfig<T>[]>`           | Required     | Declarative configuration of the fields to render, in display order.                 |
| `crossFieldValidators` | `input<CrossFieldValidator<T>[]>`            | `[]`         | Form-level validators that check values across multiple fields (e.g. confirming a password). |
| `columns`              | `input<number>`                              | `1`          | Number of grid columns fields are laid out in on desktop; always collapses to 1 column on mobile. |
| `serverErrors`         | `input<Partial<Record<keyof T, string>>>`    | `{}`         | Errors returned by the backend after a submit, keyed by field; auto-clears once the user edits that field. |
| `formSubmit`           | `output<T>`                                  | N/A          | Emitted with the typed form values, only when the native form and every `crossFieldValidators` check pass. |
| `mode`                 | `input<'submit' \| 'live'>`                  | `'submit'`   | `'submit'`: only `formSubmit` fires, on submit. `'live'`: `valueChange` also fires continuously as the user edits, in addition to `formSubmit` staying available. |
| `valueChange`          | `output<T>`                                  | N/A          | Emitted with the typed, valid values on every change, only when `mode` is `'live'`. Fires once immediately if the form starts valid with its defaults. |

### `FieldConfig<T>`

| Property      | Type                   | Default   | Description                                                                 |
| ------------- | ---------------------- | --------- | ---------------------------------------------------------------------------- |
| `key`         | `keyof T`               | Required  | Property of `T` this field reads and writes its value from.                 |
| `label`       | `string`                | Required  | Text displayed as the field's label.                                        |
| `type`        | `FieldType`             | Required  | Input type this field renders as: `text`, `number`, `email`, `password`, `textarea`, `select`, `radio`, `checkbox`, or `date`. |
| `placeholder` | `string`                | None      | Placeholder text shown when the field is empty.                             |
| `options`     | `FieldOption[]`         | None      | Choices available for `select` and `radio` fields.                          |
| `validators`  | `FieldValidatorConfig`  | None      | Native Angular validation rules for this field: `required`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `email`, plus optional custom `errorMessages`. |
| `defaultValue`| `T[keyof T]`            | None      | Initial value assigned to the field before user interaction.                |
| `colSpan`     | `1 \| 2`                | `1`          | How many grid columns this field spans, when the component's `columns` input is 2 or more. |
| `disabled`    | `boolean`               | `false`      | Renders the control disabled from the start; still included in the value `formSubmit` emits. |

### Theming

`FormBuilder` sizes and colors itself via CSS custom properties, part of
the shared `--zhunam-*` namespace used across every `@zhunam/*` library.
Set any of them from the consuming app's own stylesheet, scoped to
`lib-form-builder` or wider:

| Custom property | Default | Description |
| ------------------------------- | -------- | -------------------------------------------------- |
| `--zhunam-primary`               | `#3b82f6` | Submit button background, radio/checkbox accent color. |
| `--zhunam-primary-content`       | `#fff`    | Submit button text/icon color, always painted on top of `--zhunam-primary`. |
| `--zhunam-focus`                 | `var(--zhunam-primary)` | Focus outline and border on controls, independent from `--zhunam-primary` so a high-contrast focus ring doesn't require changing your brand color. |
| `--zhunam-text`                  | `#1f2937` | Base text color, radio/checkbox option labels. |
| `--zhunam-text-secondary`        | `#374151` | Field label text. |
| `--zhunam-border`                | `#d1d5db` | Control borders. |
| `--zhunam-error`                 | `#dc2626` | Validation/server error message text. |
| `--zhunam-radius`                | `0.5rem`  | Control and submit button corner radius. |
| `--zhunam-font-family`           | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | Font for the whole component. |
| `--zhunam-font-size`             | `0.9375rem` | Base font size. |
| `--zhunam-spacing`               | `1rem`    | Vertical rhythm between fields, and the grid gap on desktop. |
| `--zhunam-transition-duration`   | `150ms`   | Duration of border/opacity transitions. |
| `--zhunam-form-control-padding-x` | `0.75rem` | Horizontal padding inside inputs/selects/textareas. |
| `--zhunam-form-control-padding-y` | `0.5rem`  | Vertical padding inside inputs/selects/textareas. |

`--fb-columns` is an internal implementation detail (it carries the
`columns` input's value into the field grid's CSS), not a themeable
custom property; setting it manually has no supported effect.

## Compatibility

`@angular/core` and `@angular/forms` `^20.0.0 || ^21.0.0 || ^22.0.0`.

## Why this one

- Declarative validation, per-field and cross-field (e.g. confirming a
  password), without ever exposing Angular's `ValidatorFn` or
  `AbstractControl` in the public API.
- Heuristic ReDoS protection on validation `pattern`s, with dedicated
  tests. A catastrophic-backtracking regex in your config throws
  instead of hanging the browser.
- Sanitization guaranteed by interpolation, never `innerHTML`: safe to
  render even if your field config ends up sourced from outside your
  own codebase.
- Accessible by default: `aria-invalid`/`aria-describedby` stay in sync
  with whichever error message is actually visible, and radio groups
  get a correctly labelled `radiogroup` role.
- Server-side error handling with automatic clearing: show a backend
  rejection per field with one input, no manual cleanup wiring.

## License

MIT

---

Built by Ariana Mora · [LinkedIn](https://www.linkedin.com/in/ariana-andreina-mora) · [GitHub](https://github.com/zhunam)
