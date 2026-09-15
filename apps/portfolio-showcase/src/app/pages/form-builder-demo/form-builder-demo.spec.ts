import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilderDemo } from './form-builder-demo';
import { PackageInfoCard } from '../../shared/package-info-card/package-info-card';

describe('FormBuilderDemo', () => {
  let component: FormBuilderDemo;
  let fixture: ComponentFixture<FormBuilderDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormBuilderDemo],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FormBuilderDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Guards against a copy-paste mistake across the 5 demo pages: each one
  // wires its own header's <app-package-info-card> to its own library, not
  // a neighbor's. Checked via the real bound input, not just rendered text.
  it('passes @zhunam/form-builder, not another library, to the package info card', () => {
    fixture.detectChanges();
    const packageCard = fixture.debugElement.query(By.directive(PackageInfoCard));
    expect(packageCard).toBeTruthy();
    expect(packageCard.componentInstance.library().importPath).toBe('@zhunam/form-builder');
  });
});
