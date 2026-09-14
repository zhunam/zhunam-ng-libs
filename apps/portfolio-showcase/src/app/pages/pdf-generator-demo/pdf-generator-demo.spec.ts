import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfGeneratorDemo } from './pdf-generator-demo';

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
});
