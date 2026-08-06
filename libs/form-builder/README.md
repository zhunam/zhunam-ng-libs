# @zhunam/form-builder

A declarative Angular form renderer — reactive validation, cross-field
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

## API

### `FormBuilder<T>`

| Name                  | Type                                        | Default      | Description                                                                          |
| --------------------- | -------------------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| `fields`               | `input.required<FieldConfig<T>[]>`           | — (required) | Declarative configuration of the fields to render, in display order.                 |
| `crossFieldValidators` | `input<CrossFieldValidator<T>[]>`            | `[]`         | Form-level validators that check values across multiple fields (e.g. confirming a password). |
| `columns`              | `input<number>`                              | `1`          | Number of grid columns fields are laid out in on desktop; always collapses to 1 column on mobile. |
| `serverErrors`         | `input<Partial<Record<keyof T, string>>>`    | `{}`         | Errors returned by the backend after a submit, keyed by field; auto-clears once the user edits that field. |
| `formSubmit`           | `output<T>`                                  | —            | Emitted with the typed form values, only when the native form and every `crossFieldValidators` check pass. |

### `FieldConfig<T>`

| Property      | Type                   | Default      | Description                                                                 |
| ------------- | ---------------------- | ------------ | ---------------------------------------------------------------------------- |
| `key`         | `keyof T`               | — (required) | Property of `T` this field reads and writes its value from.                 |
| `label`       | `string`                | — (required) | Text displayed as the field's label.                                        |
| `type`        | `FieldType`             | — (required) | Input type this field renders as: `text`, `number`, `email`, `password`, `textarea`, `select`, `radio`, `checkbox`, or `date`. |
| `placeholder` | `string`                | —            | Placeholder text shown when the field is empty.                             |
| `options`     | `FieldOption[]`         | —            | Choices available for `select` and `radio` fields.                          |
| `validators`  | `FieldValidatorConfig`  | —            | Native Angular validation rules for this field: `required`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `email`, plus optional custom `errorMessages`. |
| `defaultValue`| `T[keyof T]`            | —            | Initial value assigned to the field before user interaction.                |
| `colSpan`     | `1 \| 2`                | `1`          | How many grid columns this field spans, when the component's `columns` input is 2 or more. |
| `disabled`    | `boolean`               | `false`      | Renders the control disabled from the start; still included in the value `formSubmit` emits. |

## Compatibility

`@angular/core` and `@angular/forms` `^20.0.0 || ^21.0.0 || ^22.0.0`.

## Why this one

- Declarative validation, per-field and cross-field (e.g. confirming a
  password), without ever exposing Angular's `ValidatorFn` or
  `AbstractControl` in the public API.
- Heuristic ReDoS protection on validation `pattern`s, with dedicated
  tests — a catastrophic-backtracking regex in your config throws
  instead of hanging the browser.
- Sanitization guaranteed by interpolation, never `innerHTML` — safe to
  render even if your field config ends up sourced from outside your
  own codebase.
- Accessible by default: `aria-invalid`/`aria-describedby` stay in sync
  with whichever error message is actually visible, and radio groups
  get a correctly labelled `radiogroup` role.
- Server-side error handling with automatic clearing — show a backend
  rejection per field with one input, no manual cleanup wiring.

## License

MIT

---

Built by Ariana Mora — [LinkedIn](https://www.linkedin.com/in/ariana-andreina-mora) · [GitHub](https://github.com/zhunam)
