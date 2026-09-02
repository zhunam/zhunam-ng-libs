import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarDemo } from './calendar-demo';

describe('CalendarDemo', () => {
  let component: CalendarDemo;
  let fixture: ComponentFixture<CalendarDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDemo],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
