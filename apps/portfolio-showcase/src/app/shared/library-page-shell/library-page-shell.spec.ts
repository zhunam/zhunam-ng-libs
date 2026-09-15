import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LibraryPageShell } from './library-page-shell';

@Component({
  selector: 'app-host',
  imports: [LibraryPageShell],
  template: `<app-library-page-shell><p>projected content</p></app-library-page-shell>`,
})
class HostComponent {}

describe('LibraryPageShell', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([
          { path: '', component: HostComponent },
          { path: 'data-grid', component: HostComponent },
          { path: 'form-builder', component: HostComponent },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  it('projects the page-specific content passed to it', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('projected content');
  });

  it('renders every library in the sidebar nav, real links for available ones', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Data Grid');
    expect(nativeElement.textContent).toContain('Form Builder');

    const link = nativeElement.querySelector('a[href="/data-grid"]');
    expect(link).toBeTruthy();
  });
});
