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
  protected readonly crossFieldValidators = [passwordsMatchValidator];
  protected readonly submittedValue = signal<RegistrationForm | null>(null);

  protected readonly usageSnippet = `import { FormBuilder } from '@zhunam/form-builder';

<lib-form-builder
  [fields]="fields"
  [crossFieldValidators]="crossFieldValidators"
  (formSubmit)="onFormSubmit($event)"
/>`;

  protected onFormSubmit(value: RegistrationForm): void {
    this.submittedValue.set(value);
  }

  protected submittedJson(): string | null {
    const value = this.submittedValue();
    return value ? JSON.stringify(value, null, 2) : null;
  }
}
