import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from './form-builder';
import { CrossFieldValidator, FieldConfig } from '../models/field-config';

interface TestModel {
  name: string;
  age: number;
  bio: string;
  country: string;
  plan: number;
  agree: boolean;
  birthday: string;
  email: string;
  password: string;
  confirmPassword: string;
  code: string;
}

function createFixture(
  fields: FieldConfig<TestModel>[],
  options: {
    crossFieldValidators?: CrossFieldValidator<TestModel>[];
    columns?: number;
    serverErrors?: Partial<Record<keyof TestModel, string>>;
    mode?: 'submit' | 'live';
  } = {},
): ComponentFixture<FormBuilder<TestModel>> {
  const fixture = TestBed.createComponent(FormBuilder<TestModel>);
  fixture.componentRef.setInput('fields', fields);
  if (options.crossFieldValidators) {
    fixture.componentRef.setInput('crossFieldValidators', options.crossFieldValidators);
  }
  if (options.columns !== undefined) {
    fixture.componentRef.setInput('columns', options.columns);
  }
  if (options.serverErrors) {
    fixture.componentRef.setInput('serverErrors', options.serverErrors);
  }
  if (options.mode) {
    fixture.componentRef.setInput('mode', options.mode);
  }
  fixture.detectChanges();
  return fixture;
}

function root(fixture: ComponentFixture<FormBuilder<TestModel>>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function getFieldsGrid(fixture: ComponentFixture<FormBuilder<TestModel>>): HTMLElement {
  return root(fixture).querySelector('.fb-fields-grid') as HTMLElement;
}

function getInput(
  fixture: ComponentFixture<FormBuilder<TestModel>>,
  type: string,
): HTMLInputElement {
  return root(fixture).querySelector(`input[type="${type}"]`) as HTMLInputElement;
}

function getTextarea(fixture: ComponentFixture<FormBuilder<TestModel>>): HTMLTextAreaElement {
  return root(fixture).querySelector('textarea') as HTMLTextAreaElement;
}

function getSelect(fixture: ComponentFixture<FormBuilder<TestModel>>): HTMLSelectElement {
  return root(fixture).querySelector('select') as HTMLSelectElement;
}

function getSubmitButton(fixture: ComponentFixture<FormBuilder<TestModel>>): HTMLButtonElement {
  return root(fixture).querySelector('.fb-submit') as HTMLButtonElement;
}

function getErrorText(fixture: ComponentFixture<FormBuilder<TestModel>>): string | null {
  return root(fixture).querySelector('.fb-error')?.textContent?.trim() ?? null;
}

function isFormValid(fixture: ComponentFixture<FormBuilder<TestModel>>): boolean {
  return !getSubmitButton(fixture).disabled;
}

function setValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  fixture: ComponentFixture<FormBuilder<TestModel>>,
): void {
  el.value = value;
  el.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

function blur(el: HTMLElement, fixture: ComponentFixture<FormBuilder<TestModel>>): void {
  el.dispatchEvent(new Event('blur'));
  fixture.detectChanges();
}

// Dispatches the same native `submit` event a browser fires whether the
// user clicked the submit button or pressed Enter inside a field — jsdom
// doesn't implement implicit Enter-key submission, so this is the accurate
// way to simulate "a submit was triggered" regardless of the trigger.
function submitForm(fixture: ComponentFixture<FormBuilder<TestModel>>): void {
  (root(fixture).querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit', { cancelable: true }),
  );
  fixture.detectChanges();
}

describe('FormBuilder', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormBuilder],
    }).compileComponents();
  });

  describe('rendering', () => {
    const allTypesFields: FieldConfig<TestModel>[] = [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'age', label: 'Age', type: 'number' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'password', label: 'Password', type: 'password' },
      { key: 'birthday', label: 'Birthday', type: 'date' },
      { key: 'bio', label: 'Bio', type: 'textarea' },
      {
        key: 'country',
        label: 'Country',
        type: 'select',
        options: [
          { value: 'ar', label: 'Argentina' },
          { value: 'br', label: 'Brasil' },
        ],
      },
      {
        key: 'plan',
        label: 'Plan',
        type: 'radio',
        options: [
          { value: 1, label: 'Basic' },
          { value: 2, label: 'Pro' },
        ],
      },
      { key: 'agree', label: 'Agree to terms', type: 'checkbox' },
    ];

    it('renders one control of the correct type for each FieldConfig', () => {
      const fixture = createFixture(allTypesFields);
      const rootEl = root(fixture);

      expect(rootEl.querySelector('input[type="text"]')).not.toBeNull();
      expect(rootEl.querySelector('input[type="number"]')).not.toBeNull();
      expect(rootEl.querySelector('input[type="email"]')).not.toBeNull();
      expect(rootEl.querySelector('input[type="password"]')).not.toBeNull();
      expect(rootEl.querySelector('input[type="date"]')).not.toBeNull();
      expect(getTextarea(fixture)).not.toBeNull();
      expect(getSelect(fixture)?.querySelectorAll('option').length).toBe(2);
      expect(rootEl.querySelectorAll('input[type="radio"]').length).toBe(2);
      expect(rootEl.querySelector('input[type="checkbox"]')).not.toBeNull();
    });

    it('shows the label for each field', () => {
      const fixture = createFixture(allTypesFields);
      const text = root(fixture).textContent ?? '';

      for (const field of allTypesFields) {
        expect(text).toContain(field.label);
      }
    });
  });

  describe('native validation', () => {
    it('marks a required field left empty as invalid', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
      ]);
      expect(isFormValid(fixture)).toBe(false);
    });

    it('minLength rejects a shorter value and accepts one that meets it', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { minLength: 3 } },
      ]);
      const input = getInput(fixture, 'text');

      setValue(input, 'ab', fixture);
      expect(isFormValid(fixture)).toBe(false);

      setValue(input, 'abc', fixture);
      expect(isFormValid(fixture)).toBe(true);
    });

    it('maxLength rejects a longer value and accepts one within the limit', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { maxLength: 3 } },
      ]);
      const input = getInput(fixture, 'text');

      setValue(input, 'abcd', fixture);
      expect(isFormValid(fixture)).toBe(false);

      setValue(input, 'abc', fixture);
      expect(isFormValid(fixture)).toBe(true);
    });

    it('min/max reject values outside the range and accept values inside it', () => {
      const fixture = createFixture([
        { key: 'age', label: 'Age', type: 'number', validators: { min: 18, max: 65 } },
      ]);
      const input = getInput(fixture, 'number');

      setValue(input, '17', fixture);
      expect(isFormValid(fixture)).toBe(false);

      setValue(input, '30', fixture);
      expect(isFormValid(fixture)).toBe(true);

      setValue(input, '66', fixture);
      expect(isFormValid(fixture)).toBe(false);
    });

    it('pattern rejects a value that does not match and accepts one that does', () => {
      const fixture = createFixture([
        { key: 'code', label: 'Code', type: 'text', validators: { pattern: '^[A-Z]{3}$' } },
      ]);
      const input = getInput(fixture, 'text');

      setValue(input, 'abc', fixture);
      expect(isFormValid(fixture)).toBe(false);

      setValue(input, 'ABC', fixture);
      expect(isFormValid(fixture)).toBe(true);
    });

    it('email rejects a malformed address and accepts a well-formed one', () => {
      const fixture = createFixture([
        { key: 'email', label: 'Email', type: 'email', validators: { email: true } },
      ]);
      const input = getInput(fixture, 'email');

      setValue(input, 'not-an-email', fixture);
      expect(isFormValid(fixture)).toBe(false);

      setValue(input, 'user@example.com', fixture);
      expect(isFormValid(fixture)).toBe(true);
    });

    it('shows the custom errorMessages text when the control is touched and invalid', () => {
      const fixture = createFixture([
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          validators: { required: true, errorMessages: { required: 'Please enter your name' } },
        },
      ]);
      blur(getInput(fixture, 'text'), fixture);

      expect(getErrorText(fixture)).toBe('Please enter your name');
    });

    it('shows a default message when no errorMessages is provided', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
      ]);
      blur(getInput(fixture, 'text'), fixture);

      expect(getErrorText(fixture)).toBe('Este campo es obligatorio.');
    });
  });

  describe('checkbox (simple boolean)', () => {
    it('a required checkbox left unchecked is invalid — confirms requiredTrue, not required', () => {
      const fixture = createFixture([
        { key: 'agree', label: 'Agree to terms', type: 'checkbox', validators: { required: true } },
      ]);
      // Plain Validators.required treats `false` as non-empty, so this would
      // incorrectly pass if requiredTrue weren't used for checkbox fields.
      expect(isFormValid(fixture)).toBe(false);

      getInput(fixture, 'checkbox').click();
      fixture.detectChanges();

      expect(isFormValid(fixture)).toBe(true);
    });
  });

  describe('radio', () => {
    it('does not let two radio fields interfere with each other when selecting an option', () => {
      const fixture = createFixture([
        {
          key: 'plan',
          label: 'Plan',
          type: 'radio',
          options: [
            { value: 1, label: 'Basic' },
            { value: 2, label: 'Pro' },
          ],
        },
        {
          key: 'country',
          label: 'Country',
          type: 'radio',
          options: [
            { value: 'ar', label: 'Argentina' },
            { value: 'br', label: 'Brasil' },
          ],
        },
      ]);
      const radios = root(fixture).querySelectorAll<HTMLInputElement>('input[type="radio"]');
      const planBasic = radios[0];
      const countryArgentina = radios[2];

      planBasic.click();
      fixture.detectChanges();
      countryArgentina.click();
      fixture.detectChanges();

      expect(planBasic.checked).toBe(true);
      expect(countryArgentina.checked).toBe(true);
    });
  });

  describe('select', () => {
    it('reads a numeric FieldOption.value back as a number, not a string', () => {
      const fixture = createFixture([
        {
          key: 'plan',
          label: 'Plan',
          type: 'select',
          options: [
            { value: 1, label: 'Basic' },
            { value: 2, label: 'Pro' },
          ],
        },
      ]);
      const select = getSelect(fixture);
      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      let emitted: TestModel | undefined;
      fixture.componentInstance.formSubmit.subscribe((value) => (emitted = value));
      submitForm(fixture);

      expect(emitted?.plan).toBe(2);
      expect(typeof emitted?.plan).toBe('number');
    });
  });

  describe('cross-field validation', () => {
    const passwordFields: FieldConfig<TestModel>[] = [
      { key: 'password', label: 'Password', type: 'password' },
      { key: 'confirmPassword', label: 'Confirm password', type: 'password' },
    ];

    const passwordsMatch: CrossFieldValidator<TestModel> = {
      validate: (value) =>
        value.password !== value.confirmPassword
          ? { confirmPassword: 'Passwords must match' }
          : null,
    };

    it('blocks submit and shows the message on the indicated field when a CrossFieldValidator fails', () => {
      const fixture = createFixture(passwordFields, { crossFieldValidators: [passwordsMatch] });
      const passwordInputs = root(fixture).querySelectorAll<HTMLInputElement>(
        'input[type="password"]',
      );
      const password = passwordInputs[0];
      const confirmPassword = passwordInputs[1];
      setValue(password, 'secret123', fixture);
      setValue(confirmPassword, 'different', fixture);

      const emitted: TestModel[] = [];
      fixture.componentInstance.formSubmit.subscribe((value) => emitted.push(value));
      submitForm(fixture);

      expect(emitted).toEqual([]);
      expect(getErrorText(fixture)).toBe('Passwords must match');
    });

    it('does not block submit when the CrossFieldValidator passes', () => {
      const fixture = createFixture(passwordFields, { crossFieldValidators: [passwordsMatch] });
      const passwordInputs = root(fixture).querySelectorAll<HTMLInputElement>(
        'input[type="password"]',
      );
      const password = passwordInputs[0];
      const confirmPassword = passwordInputs[1];
      setValue(password, 'secret123', fixture);
      setValue(confirmPassword, 'secret123', fixture);

      const emitted: TestModel[] = [];
      fixture.componentInstance.formSubmit.subscribe((value) => emitted.push(value));
      submitForm(fixture);

      expect(emitted.length).toBe(1);
      expect(emitted[0].password).toBe('secret123');
      expect(emitted[0].confirmPassword).toBe('secret123');
    });
  });

  describe('formSubmit output', () => {
    it('does not emit when the form is invalid, even when submit fires as it would on Enter', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
      ]);

      const emitted: TestModel[] = [];
      fixture.componentInstance.formSubmit.subscribe((value) => emitted.push(value));
      submitForm(fixture);

      expect(emitted).toEqual([]);
    });

    it('marks the form as submitted (revealing errors) even when the attempt is blocked', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
      ]);

      expect(getErrorText(fixture)).toBeNull();
      submitForm(fixture);
      expect(getErrorText(fixture)).toBe('Este campo es obligatorio.');
    });

    it('emits the correct values when the form is valid', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
        { key: 'age', label: 'Age', type: 'number' },
      ]);
      setValue(getInput(fixture, 'text'), 'Ada', fixture);
      setValue(getInput(fixture, 'number'), '30', fixture);

      const emitted: TestModel[] = [];
      fixture.componentInstance.formSubmit.subscribe((value) => emitted.push(value));
      submitForm(fixture);

      expect(emitted).toEqual([{ name: 'Ada', age: 30 }]);
    });

    it('does not convert an empty, optional number field to 0', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
        { key: 'age', label: 'Age', type: 'number' },
      ]);
      setValue(getInput(fixture, 'text'), 'Ada', fixture);
      // `age` is left empty — it's optional, so the form is still valid.

      const emitted: TestModel[] = [];
      fixture.componentInstance.formSubmit.subscribe((value) => emitted.push(value));
      submitForm(fixture);

      expect(emitted).toEqual([{ name: 'Ada', age: null }]);
    });

    it('disables the submit button while invalid and enables it once valid', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
      ]);
      expect(getSubmitButton(fixture).disabled).toBe(true);

      setValue(getInput(fixture, 'text'), 'Ada', fixture);
      expect(getSubmitButton(fixture).disabled).toBe(false);
    });
  });

  describe('grid layout', () => {
    it('defaults to a single column when columns is not specified', () => {
      const fixture = createFixture([{ key: 'name', label: 'Name', type: 'text' }]);

      // jsdom doesn't resolve `grid-template-columns: repeat(var(--fb-columns), 1fr)`
      // from an actual stylesheet, so the custom property itself — exactly
      // what the component sets — is the reliable, meaningful assertion here.
      expect(getFieldsGrid(fixture).style.getPropertyValue('--fb-columns')).toBe('1');
    });

    it('sets the --fb-columns custom property to the columns input value', () => {
      const fixture = createFixture([{ key: 'name', label: 'Name', type: 'text' }], {
        columns: 2,
      });

      expect(getFieldsGrid(fixture).style.getPropertyValue('--fb-columns')).toBe('2');
    });

    it('spans the full grid width for a field with colSpan: 2', () => {
      const fixture = createFixture(
        [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'email', label: 'Email', type: 'email', colSpan: 2 },
        ],
        { columns: 2 },
      );
      const fieldEls = root(fixture).querySelectorAll('.fb-field');

      expect(fieldEls[0].classList.contains('fb-field--span-2')).toBe(false);
      expect(fieldEls[1].classList.contains('fb-field--span-2')).toBe(true);
    });
  });

  describe('disabled fields', () => {
    it('includes a disabled field with a defaultValue in the value formSubmit emits', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
        { key: 'plan', label: 'Plan', type: 'text', disabled: true, defaultValue: 3 },
      ]);
      setValue(getInput(fixture, 'text'), 'Ada', fixture);

      const emitted: TestModel[] = [];
      fixture.componentInstance.formSubmit.subscribe((value) => emitted.push(value));
      submitForm(fixture);

      // `.value` would silently drop `plan` here since it's disabled —
      // confirms formSubmit uses `getRawValue()` instead.
      expect(emitted).toEqual([{ name: 'Ada', plan: 3 }]);
    });

    it('does not let a required + disabled field invalidate the form', () => {
      const fixture = createFixture([
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          disabled: true,
          validators: { required: true },
        },
      ]);

      // Angular excludes disabled controls from their parent's validity
      // aggregation entirely — this documents that native behavior for a
      // required + disabled field, since it's easy to assume otherwise.
      expect(isFormValid(fixture)).toBe(true);
    });
  });

  describe('serverErrors', () => {
    it('shows the server error message for a field listed in serverErrors', () => {
      const fixture = createFixture([{ key: 'email', label: 'Email', type: 'email' }], {
        serverErrors: { email: 'This email is already registered.' },
      });

      expect(getErrorText(fixture)).toBe('This email is already registered.');
    });

    it('clears the server error once the user changes the field value', () => {
      const fixture = createFixture([{ key: 'email', label: 'Email', type: 'email' }], {
        serverErrors: { email: 'This email is already registered.' },
      });
      expect(getErrorText(fixture)).toBe('This email is already registered.');

      setValue(getInput(fixture, 'email'), 'new@example.com', fixture);

      expect(getErrorText(fixture)).toBeNull();
    });

    it('does not block submit while a server error is shown', () => {
      const fixture = createFixture([{ key: 'email', label: 'Email', type: 'email' }], {
        serverErrors: { email: 'This email is already registered.' },
      });

      expect(getSubmitButton(fixture).disabled).toBe(false);

      const emitted: TestModel[] = [];
      fixture.componentInstance.formSubmit.subscribe((value) => emitted.push(value));
      submitForm(fixture);

      expect(emitted.length).toBe(1);
    });
  });

  describe('accessibility (ARIA)', () => {
    it('does not set aria-invalid or aria-describedby before the error is shown', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
      ]);
      const input = getInput(fixture, 'text');

      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(input.hasAttribute('aria-describedby')).toBe(false);
    });

    it('sets aria-invalid and aria-describedby once the error becomes visible', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
      ]);
      const input = getInput(fixture, 'text');
      blur(input, fixture);

      const errorEl = root(fixture).querySelector('.fb-error') as HTMLElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe(errorEl.id);
    });

    it('clears aria-invalid and aria-describedby again once the field becomes valid', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
      ]);
      const input = getInput(fixture, 'text');
      blur(input, fixture);
      expect(input.getAttribute('aria-invalid')).toBe('true');

      setValue(input, 'Ada', fixture);

      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(input.hasAttribute('aria-describedby')).toBe(false);
    });

    it('gives the radio group a radiogroup role labelled by its legend', () => {
      const fixture = createFixture([
        {
          key: 'plan',
          label: 'Plan',
          type: 'radio',
          options: [
            { value: 1, label: 'Basic' },
            { value: 2, label: 'Pro' },
          ],
        },
      ]);
      const fieldset = root(fixture).querySelector('fieldset') as HTMLElement;
      const legend = root(fixture).querySelector('legend') as HTMLElement;

      expect(fieldset.getAttribute('role')).toBe('radiogroup');
      expect(fieldset.getAttribute('aria-labelledby')).toBe(legend.id);
    });
  });

  describe('security', () => {
    it('renders label, placeholder, and FieldOption.label as plain text, never as HTML', () => {
      const malicious = '<script>alert(1)</script>';
      const fixture = createFixture([
        { key: 'name', label: malicious, type: 'text', placeholder: malicious },
        {
          key: 'country',
          label: 'Country',
          type: 'select',
          options: [{ value: 'ar', label: malicious }],
        },
      ]);
      const rootEl = root(fixture);

      // No real <script> element ever lands in the DOM.
      expect(rootEl.querySelector('script')).toBeNull();
      // The label renders the malicious string as literal, escaped text —
      // this is the actual thing that matters for interpolation safety.
      const labelEl = rootEl.querySelector('.fb-label') as HTMLElement;
      expect(labelEl.textContent).toBe(malicious);
      // `placeholder` is an HTML *attribute*, not markup — its content is
      // never parsed as HTML/script regardless of what string it holds, so
      // this only confirms the raw value made it through unmangled, not a
      // security property (searching innerHTML for the raw substring here
      // would be a false positive: it'd also match safely inside this
      // attribute, which never executes).
      expect(getInput(fixture, 'text').getAttribute('placeholder')).toBe(malicious);
    });
  });

  describe('mode / valueChange output', () => {
    it('regression: with the default mode (never set), valueChange never emits and formSubmit behaves exactly as before', () => {
      const fixture = createFixture([
        { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
        { key: 'age', label: 'Age', type: 'number' },
      ]);

      const liveEmitted: TestModel[] = [];
      fixture.componentInstance.valueChange.subscribe((value) => liveEmitted.push(value));

      setValue(getInput(fixture, 'text'), 'Ada', fixture);
      setValue(getInput(fixture, 'number'), '30', fixture);
      expect(liveEmitted).toEqual([]); // no live emission from typing alone

      const submitEmitted: TestModel[] = [];
      fixture.componentInstance.formSubmit.subscribe((value) => submitEmitted.push(value));
      submitForm(fixture);

      expect(submitEmitted).toEqual([{ name: 'Ada', age: 30 }]);
      expect(liveEmitted).toEqual([]); // still nothing, even after a real submit
    });

    it('mode "live" emits the initial value immediately when the form starts valid with its defaults', async () => {
      const fields: FieldConfig<TestModel>[] = [
        { key: 'name', label: 'Name', type: 'text', defaultValue: 'Ada' },
      ];
      const fixture = TestBed.createComponent(FormBuilder<TestModel>);
      fixture.componentRef.setInput('fields', fields);
      fixture.componentRef.setInput('mode', 'live');

      const emitted: TestModel[] = [];
      // Subscribed before the first detectChanges(), so this is guaranteed
      // to catch the initial emission wherever in that cycle it fires.
      fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

      fixture.detectChanges();
      await fixture.whenStable();

      expect(emitted).toEqual([{ name: 'Ada' }]);
    });

    it('mode "live" emits the coerced, typed value on every valid field change', () => {
      const fixture = createFixture(
        [
          { key: 'name', label: 'Name', type: 'text', validators: { required: true } },
          { key: 'age', label: 'Age', type: 'number' },
        ],
        { mode: 'live' },
      );

      const emitted: TestModel[] = [];
      fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

      setValue(getInput(fixture, 'text'), 'Ada', fixture);
      setValue(getInput(fixture, 'number'), '30', fixture);

      expect(emitted[emitted.length - 1]).toEqual({ name: 'Ada', age: 30 });
      expect(emitted.length).toBeGreaterThanOrEqual(2); // one per valid keystroke-triggered change
    });

    it('mode "live" does not emit while the form is invalid', () => {
      const fixture = createFixture(
        [{ key: 'name', label: 'Name', type: 'text', validators: { required: true } }],
        { mode: 'live' },
      );

      const emitted: TestModel[] = [];
      fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));
      emitted.length = 0; // discard the initial emission, if the empty required field allowed one

      setValue(getInput(fixture, 'text'), 'A', fixture);
      setValue(getInput(fixture, 'text'), '', fixture); // back to invalid (required)

      expect(emitted[emitted.length - 1]).toEqual({ name: 'A' }); // last emission is the valid one, not the empty one
    });

    it('mode "live" respects crossFieldValidators, not just native FormGroup validity', () => {
      const fixture = createFixture(
        [
          { key: 'password', label: 'Password', type: 'password' },
          { key: 'confirmPassword', label: 'Confirm', type: 'password' },
        ],
        {
          mode: 'live',
          crossFieldValidators: [
            {
              validate: (value) =>
                value.password !== value.confirmPassword
                  ? { confirmPassword: 'Must match' }
                  : null,
            },
          ],
        },
      );
      const [passwordInput, confirmInput] = Array.from(
        root(fixture).querySelectorAll('input[type="password"]'),
      ) as HTMLInputElement[];

      const emitted: TestModel[] = [];
      fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));
      emitted.length = 0;

      setValue(passwordInput, 'secret', fixture);
      setValue(confirmInput, 'different', fixture); // native-valid, but cross-field mismatch

      expect(emitted).toEqual([]); // never emitted a mismatched pair
    });

    it('leaves the submit button visible and functional in mode "live" (no conditional hiding)', () => {
      const fixture = createFixture(
        [{ key: 'name', label: 'Name', type: 'text', validators: { required: true } }],
        { mode: 'live' },
      );

      expect(getSubmitButton(fixture)).toBeTruthy();

      setValue(getInput(fixture, 'text'), 'Ada', fixture);
      const submitEmitted: TestModel[] = [];
      fixture.componentInstance.formSubmit.subscribe((value) => submitEmitted.push(value));
      submitForm(fixture);

      expect(submitEmitted).toEqual([{ name: 'Ada' }]); // formSubmit still works in 'live' mode too
    });

    it('cleans up its valueChanges subscription on destroy, no emissions after that', () => {
      const fixture = createFixture(
        [{ key: 'name', label: 'Name', type: 'text' }],
        { mode: 'live' },
      );
      const component = fixture.componentInstance;

      const emitted: TestModel[] = [];
      component.valueChange.subscribe((value) => emitted.push(value));
      const countBeforeDestroy = emitted.length;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formGroup = (component as any).formGroup();
      fixture.destroy();
      formGroup.get('name')?.setValue('Ada after destroy');

      expect(emitted.length).toBe(countBeforeDestroy); // no new emission reached the (destroyed) output
    });
  });
});
