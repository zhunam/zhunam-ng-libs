import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfGeneratorDemo } from './pdf-generator-demo';
import { PackageInfoCard } from '../../shared/package-info-card/package-info-card';

describe('PdfGeneratorDemo', () => {
  let component: PdfGeneratorDemo;
  let fixture: ComponentFixture<PdfGeneratorDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfGeneratorDemo],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PdfGeneratorDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Guards against a copy-paste mistake across the 5 demo pages: each one
  // wires its own header's <app-package-info-card> to its own library, not
  // a neighbor's. Checked via the real bound input, not just rendered text.
  it('passes @zhunam/pdf-generator, not another library, to the package info card', () => {
    fixture.detectChanges();
    const packageCard = fixture.debugElement.query(By.directive(PackageInfoCard));
    expect(packageCard).toBeTruthy();
    expect(packageCard.componentInstance.library().importPath).toBe('@zhunam/pdf-generator');
  });

  // <lib-pdf-preview> is reactive: mounting it immediately calls
  // generatePdf(), which lazy-loads pdfmake + its embedded font (~1.9MB
  // combined, confirmed via a real Lighthouse audit). This page defers
  // that mount behind a real user interaction instead of paying that cost
  // on every page load.
  it('does not mount <lib-pdf-preview> until the user asks for it', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('lib-pdf-preview')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Show live preview');
  });

  it('mounts <lib-pdf-preview> once the user clicks "Show live preview"', () => {
    fixture.detectChanges();

    const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (el) => (el as HTMLButtonElement).textContent?.trim() === 'Show live preview',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();

    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('lib-pdf-preview')).toBeTruthy();
  });
});
