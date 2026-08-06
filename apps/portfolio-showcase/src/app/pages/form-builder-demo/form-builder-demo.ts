import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder } from '@zhunam/form-builder';
import {
  passwordsMatchValidator,
  registrationFields,
  RegistrationForm,
} from '../../shared/mock-registration-fields';
import { libraries } from '../../shared/libraries';
import { injectCurrentUrl, sidebarLinkClasses } from '../../shared/library-sidebar';

@Component({
  selector: 'app-form-builder-demo',
  imports: [FormBuilder, RouterLink],
  templateUrl: './form-builder-demo.html',
  styleUrl: './form-builder-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormBuilderDemo {
  protected readonly libraries = libraries;
  protected readonly currentUrl = injectCurrentUrl();
  protected readonly sidebarLinkClasses = sidebarLinkClasses;

  protected readonly fields = registrationFields;
  protected readonly columns = 2;
  protected readonly crossFieldValidators = [passwordsMatchValidator];
  protected readonly submittedValue = signal<RegistrationForm | null>(null);

  // Simulates a backend rejection so the demo shows serverErrors doing
  // something real: submit with this email to see it in action, then
  // change the field to watch the message clear itself automatically.
  protected readonly serverErrors = signal<Partial<Record<keyof RegistrationForm, string>>>({});

  protected readonly usageSnippet = `import { FormBuilder } from '@zhunam/form-builder';

<lib-form-builder
  [fields]="fields"
  [columns]="2"
  [crossFieldValidators]="crossFieldValidators"
  [serverErrors]="serverErrors()"
  (formSubmit)="onFormSubmit($event)"
/>`;

  protected onFormSubmit(value: RegistrationForm): void {
    if (value.email === 'test@test.com') {
      this.serverErrors.set({ email: 'This email is already registered.' });
      return;
    }

    this.serverErrors.set({});
    this.submittedValue.set(value);
  }

  protected submittedJson(): string | null {
    const value = this.submittedValue();
    return value ? JSON.stringify(value, null, 2) : null;
  }
}
