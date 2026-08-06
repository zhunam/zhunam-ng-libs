// NUNCA usar [innerHTML], bypassSecurityTrustHtml, ni ningún mecanismo de inserción de HTML crudo en el DOM del componente.
// label, placeholder, errorMessages, y FieldOption.label se renderizan siempre con interpolación {{ }} normal de Angular — nunca vía binding de propiedad que inserte HTML.

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { CrossFieldValidator, FieldConfig, FieldOption } from '../models/field-config';
import { assertSafePattern } from '../utils/safe-pattern';

type ErrorKey = 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email';

// Angular's built-in validators report `minlength`/`maxlength` (all lowercase)
// on `control.errors`, not the camelCase keys `FieldValidatorConfig.errorMessages`
// uses — this bridges the two so consumer-facing config can stay camelCase.
const RAW_ERROR_KEY_MAP: Record<string, ErrorKey> = {
  required: 'required',
  min: 'min',
  max: 'max',
  minlength: 'minLength',
  maxlength: 'maxLength',
  pattern: 'pattern',
  email: 'email',
};

const DEFAULT_ERROR_MESSAGES: Record<ErrorKey, string> = {
  required: 'Este campo es obligatorio.',
  min: 'El valor es menor al mínimo permitido.',
  max: 'El valor supera el máximo permitido.',
  minLength: 'El valor es demasiado corto.',
  maxLength: 'El valor es demasiado largo.',
  pattern: 'El formato no es válido.',
  email: 'Ingresá un email válido.',
};

@Component({
  selector: 'lib-form-builder',
  imports: [ReactiveFormsModule],
  templateUrl: './form-builder.html',
  styleUrl: './form-builder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
})
export class FormBuilder<T> {
  /**
   * Declarative configuration of the fields to render, in display order.
   * @example
   * fields: FieldConfig<User>[] = [
   *   { key: 'email', label: 'Email', type: 'email', validators: { required: true, email: true } },
   * ];
   */
  fields = input.required<FieldConfig<T>[]>();

  /**
   * Number of grid columns fields are laid out in on desktop. Always
   * collapses to a single column below a mobile breakpoint, regardless
   * of this value — mobile-first, like the rest of the library.
   * @default 1
   * @example
   * <lib-form-builder [fields]="fields" [columns]="2" />
   */
  columns = input<number>(1);

  /**
   * Form-level validators that check values across multiple fields (e.g.
   * confirming a password). Run separately from Angular's native
   * per-control validation, only when the native `FormGroup` is valid.
   * @default []
   * @example
   * crossFieldValidators: CrossFieldValidator<User>[] = [
   *   {
   *     validate: (value) =>
   *       value.password !== value.confirmPassword
   *         ? { confirmPassword: 'Passwords must match' }
   *         : null,
   *   },
   * ];
   */
  crossFieldValidators = input<CrossFieldValidator<T>[]>([]);

  /**
   * Emitted with the typed form values, only when both the native
   * `FormGroup` and every `crossFieldValidators` check pass.
   * @example
   * <lib-form-builder [fields]="fields" (formSubmit)="onSubmit($event)" />
   */
  formSubmit = output<T>();

  protected readonly submitted = signal(false);
  protected readonly crossFieldErrors = signal<Record<string, string>>({});

  // `fields()` can change at runtime (e.g. a wizard swapping steps), so the
  // FormGroup is derived with `computed()` rather than built once in the
  // constructor: it's rebuilt only when the `fields()` array reference
  // changes. `computed()` fits better than an `effect()` here because
  // building a FormGroup is a pure derivation with no teardown to manage,
  // and `computed()` already memoizes it — the same instance is returned
  // across change-detection cycles until `fields()` itself changes.
  protected readonly formGroup = computed(() => this.buildFormGroup(this.fields()));

  private static instanceCounter = 0;
  private readonly instanceId = ++FormBuilder.instanceCounter;

  private buildFormGroup(fields: FieldConfig<T>[]): FormGroup {
    const controls: Record<string, FormControl<unknown>> = {};
    for (const field of fields) {
      const initialValue = field.defaultValue ?? (field.type === 'checkbox' ? false : null);
      controls[String(field.key)] = new FormControl<unknown>(initialValue, this.buildValidators(field));
    }
    return new FormGroup(controls);
  }

  private buildValidators(field: FieldConfig<T>): ValidatorFn[] {
    const config = field.validators;
    if (!config) {
      return [];
    }

    const validators: ValidatorFn[] = [];
    if (config.required) {
      // A checkbox's "empty" value is `false`, which Validators.required
      // doesn't treat as empty — requiredTrue is the correct check for it.
      validators.push(field.type === 'checkbox' ? Validators.requiredTrue : Validators.required);
    }
    if (config.min !== undefined) {
      validators.push(Validators.min(config.min));
    }
    if (config.max !== undefined) {
      validators.push(Validators.max(config.max));
    }
    if (config.minLength !== undefined) {
      validators.push(Validators.minLength(config.minLength));
    }
    if (config.maxLength !== undefined) {
      validators.push(Validators.maxLength(config.maxLength));
    }
    if (config.pattern !== undefined) {
      // An unsafe pattern is a bug in the consumer's config, not a runtime
      // condition to recover from — let it throw instead of swallowing it.
      assertSafePattern(config.pattern);
      validators.push(Validators.pattern(config.pattern));
    }
    if (config.email) {
      validators.push(Validators.email);
    }
    return validators;
  }

  protected controlFor(field: FieldConfig<T>): FormControl {
    return this.formGroup().get(String(field.key)) as FormControl;
  }

  protected optionsFor(field: FieldConfig<T>): FieldOption[] {
    return field.options ?? [];
  }

  // Shared by the label's `for`, the control's `id`, and (for radio groups)
  // the `name` that keeps this field's radios from being grouped with
  // another field's — RadioControlValueAccessor matches radios by `name`
  // plus parent FormGroup, and every field here shares the same FormGroup.
  protected fieldId(field: FieldConfig<T>): string {
    return `fb-${this.instanceId}-${String(field.key)}`;
  }

  protected errorMessageFor(field: FieldConfig<T>): string | null {
    const control = this.controlFor(field);
    if (!control.errors || (!control.touched && !this.submitted())) {
      return null;
    }

    const errorKey = RAW_ERROR_KEY_MAP[Object.keys(control.errors)[0]];
    if (!errorKey) {
      return null;
    }

    return field.validators?.errorMessages?.[errorKey] ?? DEFAULT_ERROR_MESSAGES[errorKey];
  }

  protected crossFieldErrorFor(field: FieldConfig<T>): string | null {
    if (!this.submitted()) {
      return null;
    }
    return this.crossFieldErrors()[String(field.key)] ?? null;
  }

  protected isSubmitDisabled(): boolean {
    return this.formGroup().invalid || Object.keys(this.crossFieldErrors()).length > 0;
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    const group = this.formGroup();

    if (group.invalid) {
      return;
    }

    const value = group.value as T;
    const errors = this.runCrossFieldValidators(value);
    this.crossFieldErrors.set(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    this.formSubmit.emit(value);
  }

  private runCrossFieldValidators(value: T): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const validator of this.crossFieldValidators()) {
      const result = validator.validate(value);
      if (result) {
        Object.assign(errors, result);
      }
    }
    return errors;
  }
}
