import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataGridDemo } from './data-grid-demo';
import { PackageInfoCard } from '../../shared/package-info-card/package-info-card';

describe('DataGridDemo', () => {
  let component: DataGridDemo;
  let fixture: ComponentFixture<DataGridDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataGridDemo],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DataGridDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Guards against a copy-paste mistake across the 5 demo pages: each one
  // wires its own header's <app-package-info-card> to its own library, not
  // a neighbor's. Checked via the real bound input, not just rendered text.
  it('passes @zhunam/data-grid, not another library, to the package info card', () => {
    fixture.detectChanges();
    const packageCard = fixture.debugElement.query(By.directive(PackageInfoCard));
    expect(packageCard).toBeTruthy();
    expect(packageCard.componentInstance.library().importPath).toBe('@zhunam/data-grid');
  });
});
