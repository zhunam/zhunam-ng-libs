import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketPreview } from './market-preview';

describe('MarketPreview', () => {
  let component: MarketPreview;
  let fixture: ComponentFixture<MarketPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
