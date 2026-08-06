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

      expect(rootEl.querySelector('script')).toBeNull();
      expect(rootEl.textContent).toContain(malicious);
      // Interpolation HTML-escapes the text on the way into the DOM — real
      // markup would show up unescaped in innerHTML, entities prove it didn't.
      expect(rootEl.innerHTML).not.toContain('<script>alert(1)</script>');
      expect(getInput(fixture, 'text').getAttribute('placeholder')).toBe(malicious);
    });
  });
});
