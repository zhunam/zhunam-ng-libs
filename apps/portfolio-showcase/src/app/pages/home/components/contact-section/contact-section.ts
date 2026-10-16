import { ChangeDetectionStrategy, Component } from '@angular/core';
import { contact, contactMailto } from '../../../../shared/contact';

@Component({
  selector: 'app-contact-section',
  imports: [],
  templateUrl: './contact-section.html',
  styleUrl: './contact-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactSection {
  protected readonly contact = contact;
  protected readonly contactMailto = contactMailto;
}
