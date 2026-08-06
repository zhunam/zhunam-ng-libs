import { CrossFieldValidator, FieldConfig } from '@zhunam/form-builder';

export interface RegistrationForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  country: string;
  accountType: string;
  subscribeNewsletter: boolean;
  birthDate: string;
}

export const registrationFields: FieldConfig<RegistrationForm>[] = [
  {
    key: 'name',
    label: 'Full name',
    type: 'text',
    placeholder: 'Ada Lovelace',
    validators: { required: true, minLength: 2 },
    colSpan: 2,
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'ada@example.com',
    validators: { required: true, email: true },
    colSpan: 2,
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    validators: { required: true, minLength: 8 },
    colSpan: 1,
  },
  {
    key: 'confirmPassword',
    label: 'Confirm password',
    type: 'password',
    validators: { required: true },
    colSpan: 1,
  },
  {
    key: 'country',
    label: 'Country',
    type: 'select',
    options: [
      { value: 'ar', label: 'Argentina' },
      { value: 'br', label: 'Brasil' },
      { value: 'cl', label: 'Chile' },
      { value: 'uy', label: 'Uruguay' },
      { value: 'co', label: 'Colombia' },
    ],
    validators: { required: true },
    colSpan: 1,
  },
  {
    key: 'accountType',
    label: 'Account type',
    type: 'radio',
    options: [
      { value: 'personal', label: 'Personal' },
      { value: 'business', label: 'Business' },
    ],
    defaultValue: 'personal',
    colSpan: 1,
  },
  {
    key: 'subscribeNewsletter',
    label: 'Subscribe to the newsletter',
    type: 'checkbox',
    colSpan: 2,
  },
  {
    key: 'birthDate',
    label: 'Birth date',
    type: 'date',
    colSpan: 2,
  },
];

export const passwordsMatchValidator: CrossFieldValidator<RegistrationForm> = {
  validate: (value: Partial<RegistrationForm>) =>
    value.password !== value.confirmPassword ? { confirmPassword: 'Passwords must match' } : null,
};
