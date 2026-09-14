import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataGridDemo } from './data-grid-demo';

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
});
