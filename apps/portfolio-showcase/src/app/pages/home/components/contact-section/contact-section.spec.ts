import { ComponentFixture, TestBed } from '@angular/core/testing';
import { contact } from '../../../../shared/contact';
import { ContactSection } from './contact-section';

describe('ContactSection', () => {
  let fixture: ComponentFixture<ContactSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactSection],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactSection);
    await fixture.whenStable();
  });

  it('links to email with a pre-filled subject', () => {
    const mailLink = (fixture.nativeElement as HTMLElement).querySelector('a[href^="mailto:"]');
    expect(mailLink?.getAttribute('href')).toBe(`mailto:${contact.email}?subject=Project%20inquiry`);
  });

  it('opens LinkedIn in a new tab', () => {
    const linkedinLink = (fixture.nativeElement as HTMLElement).querySelector(`a[href="${contact.linkedinUrl}"]`);
    expect(linkedinLink?.getAttribute('target')).toBe('_blank');
    expect(linkedinLink?.getAttribute('rel')).toContain('noopener');
  });

  it('shows the email address as plain text for visitors without a mail client', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(contact.email);
  });
});
