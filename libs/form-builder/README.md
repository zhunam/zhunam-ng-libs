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

### Presetting or replacing the form's value

The `value` input patches the form in place, without rebuilding it, so
whatever the user already typed in fields that stay unaffected is never
lost. Useful for a "swap" action or restoring a draft:

```typescript
swapValue = signal<Partial<User> | undefined>(undefined);

onSwap(): void {
  this.swapValue.set({ name: this.currentLastValue.name /* ... */ });
}
```

```html
<lib-form-builder [fields]="fields" [value]="swapValue()" mode="live" (valueChange)="onValueChange($event)" />
```

Rebuilding `fields()` itself (e.g. a wizard changing steps) also keeps
the current value of every control whose key still exists in the new
array; only a control whose key disappears is dropped, and only a
brand-new key falls back to its own `defaultValue`.

### Submitting from outside the component

```html
<lib-form-builder #form [fields]="fields" [hideSubmit]="true" [loading]="saving()" (formSubmit)="onSave($event)" />
<button (click)="form.submit()">Continue</button>
```

`submit()` runs the exact same logic the internal button would: it marks
the form submitted, validates, and emits `formSubmit` if valid. It's a
no-op while `loading` is `true`, the same guard that disables the
internal button.

### Switch and segmented appearance

`appearance` changes only how a specific `type` looks, never the control underneath it: a real `<input type="checkbox">`/`<input type="radio">` is always there, visually hidden but focusable, clickable via its label, and fully native for validation, keyboard operation, and screen readers.

```typescript
fields: FieldConfig<Settings>[] = [
  { key: 'notifications', label: 'Email notifications', type: 'checkbox', appearance: 'switch' },
  {
    key: 'plan',
    label: 'Plan',
    type: 'radio',
    appearance: 'segmented',
    options: [
      { value: 'personal', label: 'Personal' },
      { value: 'business', label: 'Business' },
    ],
  },
];
```

`'switch'` only changes `type: 'checkbox'`; `'segmented'` only changes `type: 'radio'`. Setting `appearance` on any other `type` (or leaving it unset) has no effect at all, no error, no warning.

A `'switch'` checkbox also carries `role="switch"`, the ARIA role screen readers expect for a checkbox presented as a toggle; a plain `'default'` checkbox has no `role` attribute at all.

A `'segmented'` radio option can show an icon next to its label via `FieldOption.icon`. The value is rendered as the text content of a decorative `.fb-option-icon` span, for an icon-font system that renders ligatures (e.g. Material Symbols), not as a CSS class or an `<svg>`:

```typescript
options: [
  { value: 'card', label: 'Card', icon: 'credit_card' },
  { value: 'cash', label: 'Cash', icon: 'payments' },
]
```

### Field hints and option descriptions

`hint` shows short helper text below a field, only while there's no active error: an error replaces it visually, and `aria-describedby` follows the same rule, always pointing at whichever one is currently shown, never both.

```typescript
{ key: 'password', label: 'Password', type: 'password', hint: 'At least 8 characters', validators: { required: true, minLength: 8 } }
```

`FieldOption.description` shows helper text below one specific `radio` option, independent of the field-level hint or error:

```typescript
{
  key: 'plan',
  label: 'Plan',
  type: 'radio',
  options: [
    { value: 'personal', label: 'Personal', description: 'For individual use' },
    { value: 'business', label: 'Business', description: 'For teams and invoicing' },
  ],
}
```

### Read-only fields

`readonly` keeps a field's value visible and its validation running exactly as before, only direct editing is blocked. Unlike `disabled`, the underlying `FormControl` stays enabled, so its value is never excluded from anything.

```typescript
{ key: 'referenceCode', label: 'Reference code', type: 'text', readonly: true, defaultValue: 'REF-2026-001' }
```

Only applies to `text`, `number`, `email`, `password`, `date`, and `textarea`: the HTML `readonly` attribute doesn't apply to `select`, `radio`, or `checkbox` natively, and this library doesn't simulate it for those, setting `readonly` on one of them is simply ignored.

### Autocomplete

`autocomplete` passes through to the native HTML `autocomplete` attribute, for `text`, `number`, `email`, `password`, `date`, `textarea`, and `select` fields:

```typescript
fields: FieldConfig<User>[] = [
  { key: 'username', label: 'Username', type: 'text', autocomplete: 'username' },
  { key: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
  { key: 'fullName', label: 'Full name', type: 'text', autocomplete: 'name' },
  { key: 'password', label: 'Password', type: 'password', autocomplete: 'current-password' },
  { key: 'newPassword', label: 'New password', type: 'password', autocomplete: 'new-password' },
];
```

Any value the HTML specification accepts works; it's passed through as-is, not validated. Not set on `checkbox` or `radio`: those render one native input per option, where `autocomplete` has no meaningful browser autofill behavior, so it's omitted there on purpose.

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
| `submitLabel`          | `input<string>`                              | None         | Custom label for the submit button, instead of `messages.submit()`. |
| `hideSubmit`           | `input<boolean>`                             | `false`      | Hides the internal submit button; use the public `submit()` method to trigger submission from your own UI. |
| `loading`              | `input<boolean>`                             | `false`      | Disables the internal button and makes `submit()` a no-op while `true`. |
| `value`                | `input<T>`                                   | None         | External value patched into the current form (no rebuild, no `valueChange` in `'live'` mode) every time it receives a new, non-`undefined` value. |
| `submit()`             | `(): void`                                   | N/A          | Public method: runs the same submit logic as the internal button, works whether `hideSubmit` is `true` or `false`. |

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
| `showPasswordToggle` | `boolean`        | `true`       | For a `type: 'password'` field, whether it renders a show/hide toggle button. No effect on other field types. |
| `appearance`  | `FieldAppearance` (`'default' \| 'switch' \| 'segmented'`) | `'default'` | Purely visual variant. `'switch'` only affects `type: 'checkbox'`, `'segmented'` only affects `type: 'radio'`. Any other combination is ignored, same as `'default'`. See "Switch and segmented appearance" below. |
| `hint`        | `string`                | None      | Short helper text shown below the field when there's no active error. See "Field hints and option descriptions" below. |
| `readonly`    | `boolean`               | `false`      | Native HTML `readonly`, for `text`/`number`/`email`/`password`/`date`/`textarea` only. No effect on `select`/`radio`/`checkbox`. See "Read-only fields" below. |
| `autocomplete`| `string`                | None      | Native HTML `autocomplete`, for `text`/`number`/`email`/`password`/`date`/`textarea`/`select` only. No effect on `checkbox`/`radio`. See "Autocomplete" below. |

`FieldOption` also gains an optional `description?: string`, shown below that specific option (for `radio`, see below), and an optional `icon?: string`, shown next to the label of a `radio` option rendered with `appearance: 'segmented'`; `select` has nowhere to render either, so both are ignored there.

### `FormBuilderMessages`

| Member | Type | Description |
| ------ | ---- | ------------ |
| `required()` | `() => string` | Shown when a required field is empty. |
| `email()` | `() => string` | Shown when an `email` field isn't well-formed. |
| `min(min)` | `(min: number) => string` | Shown when a numeric field is below `min`. |
| `max(max)` | `(max: number) => string` | Shown when a numeric field is above `max`. |
| `minLength(requiredLength)` | `(requiredLength: number) => string` | Shown when a field's value is shorter than `minLength`. |
| `maxLength(requiredLength)` | `(requiredLength: number) => string` | Shown when a field's value is longer than `maxLength`. |
| `pattern()` | `() => string` | Shown when a field's value doesn't match `pattern`. |
| `submit()` | `() => string` | Label of the submit button. |
| `showPassword()` | `() => string` | `aria-label` of the password toggle when the value is currently hidden. |
| `hidePassword()` | `() => string` | `aria-label` of the password toggle when the value is currently shown. |

| Export | Type | Description |
| ------ | ---- | ------------ |
| `FORM_BUILDER_MESSAGES` | `InjectionToken<FormBuilderMessages>` | Defaults to `FORM_BUILDER_MESSAGES_EN`. Prefer `provideFormBuilderMessages()` over providing this directly. |
| `provideFormBuilderMessages(overrides)` | `(overrides: Partial<FormBuilderMessages>) => Provider` | Registers a message override, merged on top of the English defaults. |
| `FORM_BUILDER_MESSAGES_EN` | `FormBuilderMessages` | English preset (the default). |
| `FORM_BUILDER_MESSAGES_ES` | `FormBuilderMessages` | Spanish preset. |

### Theming

`FormBuilder` sizes and colors itself via CSS custom properties, part of
the shared `--zhunam-*` namespace used across every `@zhunam/*` library.
None of them are declared on the component's own `:host`, so you can set
any of them from `:root`, from a wrapping element, or scoped directly to
`lib-form-builder`, whichever is more convenient for your app; the
closest ancestor that sets a given property wins, same as any other
inherited CSS custom property.

| Custom property | Default | Description |
| ------------------------------- | -------- | -------------------------------------------------- |
| `--zhunam-primary`               | `#3b82f6` | Submit button background, radio/checkbox accent color fallback. |
| `--zhunam-accent`                | `var(--zhunam-primary)` | Radio/checkbox accent color specifically, independent from `--zhunam-primary`. Falls back to it when unset. |
| `--zhunam-submit-width`          | `auto`    | Submit button width. |
| `--zhunam-primary-content`       | `#fff`    | Submit button text/icon color, always painted on top of `--zhunam-primary`. |
| `--zhunam-focus`                 | `var(--zhunam-primary)` | Focus outline and border on controls, independent from `--zhunam-primary` so a high-contrast focus ring doesn't require changing your brand color. |
| `--zhunam-text`                  | `#1f2937` | Base text color, radio/checkbox option labels. |
| `--zhunam-text-secondary`        | `#374151` | Field label text. |
| `--zhunam-border`                | `#d1d5db` | Control borders. |
| `--zhunam-error`                 | `#dc2626` | Validation/server error message background/border, where used. See `--zhunam-error-text` for the message's own text color. |
| `--zhunam-error-text`            | `var(--zhunam-error)` | Validation/server error message text color specifically. Falls back to `--zhunam-error` when unset, so most apps only ever need to set one of the two. |
| `--zhunam-radius`                | `0.5rem`  | Control and submit button corner radius. |
| `--zhunam-font-family`           | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | Font for the whole component. |
| `--zhunam-font-size`             | `0.9375rem` | Base font size. |
| `--zhunam-spacing`               | `1rem`    | Vertical rhythm between fields, and the grid gap on desktop. |
| `--zhunam-transition-duration`   | `150ms`   | Duration of border/opacity transitions. |
| `--zhunam-form-control-padding-x` | `0.75rem` | Horizontal padding inside inputs/selects/textareas. |
| `--zhunam-form-control-padding-y` | `0.5rem`  | Vertical padding inside inputs/selects/textareas. |
| `--zhunam-segmented-bg`           | `#fff`    | Inactive pill background for a `'segmented'` radio group. The active pill reuses `--zhunam-primary`/`--zhunam-primary-content` instead, same as the submit button. |

`--fb-columns` is an internal implementation detail (it carries the
`columns` input's value into the field grid's CSS), not a themeable
custom property; setting it manually has no supported effect.

### Internationalization

Every message `FormBuilder` renders on its own (validation text, the
submit button label) comes from `FORM_BUILDER_MESSAGES`, an injectable
token that defaults to English. A per-field `FieldValidatorConfig.errorMessages`
override always takes precedence over this token for that specific field.

```typescript
import { provideFormBuilderMessages, FORM_BUILDER_MESSAGES_ES } from '@zhunam/form-builder';

// app.config.ts, or any component's own `providers`:
providers: [provideFormBuilderMessages(FORM_BUILDER_MESSAGES_ES)]
```

A partial override only replaces the messages you specify, the rest stay
in English:

```typescript
providers: [provideFormBuilderMessages({ submit: () => 'Send' })]
```

Every message is a function, called on every render rather than once at
startup, so one that reads a signal updates live:

```typescript
const language = signal<'en' | 'es'>('en');

providers: [
  provideFormBuilderMessages({
    required: () => (language() === 'en' ? 'This field is required.' : 'Este campo es obligatorio.'),
    min: (min) =>
      language() === 'en' ? `The value must be at least ${min}.` : `El valor debe ser como mínimo ${min}.`,
  }),
]
```

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
