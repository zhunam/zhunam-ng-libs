import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthDemo } from './auth-demo';

describe('AuthDemo', () => {
  let component: AuthDemo;
  let fixture: ComponentFixture<AuthDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthDemo],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
