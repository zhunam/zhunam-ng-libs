import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoinSpinner } from './coin-spinner';

describe('CoinSpinner', () => {
  let component: CoinSpinner;
  let fixture: ComponentFixture<CoinSpinner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoinSpinner],
    }).compileComponents();

    fixture = TestBed.createComponent(CoinSpinner);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders the loading state with no retry control in the DOM', () => {
    fixture.componentRef.setInput('variant', 'loading');
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('button')).toBeNull();
  });

  it('renders the default message when variant is "error" and message() is not provided', () => {
    fixture.componentRef.setInput('variant', 'error');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Could not load the data.');
  });

  it('renders the exact provided message() when variant is "error"', () => {
    fixture.componentRef.setInput('variant', 'error');
    fixture.componentRef.setInput('message', 'Rate limit exceeded, try again shortly.');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Rate limit exceeded, try again shortly.');
  });

  it('emits retry() exactly once per click on the retry control', () => {
    fixture.componentRef.setInput('variant', 'error');
    fixture.detectChanges();

    let retryCount = 0;
    component.retry.subscribe(() => retryCount++);

    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    button.click();

    expect(retryCount).toBe(1);
  });

  it('renders message() with HTML-like content as plain text, never as markup', () => {
    fixture.componentRef.setInput('variant', 'error');
    fixture.componentRef.setInput('message', '<b>test</b>');
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('b')).toBeNull();
    expect(nativeElement.textContent ?? '').toContain('<b>test</b>');
  });
});
