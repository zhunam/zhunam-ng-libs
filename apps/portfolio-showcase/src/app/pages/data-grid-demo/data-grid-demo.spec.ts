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

  function usageCode(): string {
    return (fixture.nativeElement as HTMLElement).querySelector('pre code')?.textContent ?? '';
  }

  function getUsageModeButtons(): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter(
      (btn) => btn.textContent?.trim() === 'Client mode' || btn.textContent?.trim() === 'Server mode',
    );
  }

  describe('Usage panel: Client mode / Server mode snippets', () => {
    it('defaults to the client mode snippet', () => {
      fixture.detectChanges();
      const [clientButton] = getUsageModeButtons();

      expect(clientButton.getAttribute('aria-pressed')).toBe('true');
      expect(usageCode()).not.toContain('mode="server"');
      // Present only in the client snippet: selectable/row-selection API,
      // not shown at all in the server snippet.
      expect(usageCode()).toContain('selectable');
      expect(usageCode()).toContain('loadingTemplate');
      expect(usageCode()).toContain('emptyTemplate');
    });

    it('clicking Server mode swaps the snippet and flips aria-pressed on both buttons', () => {
      fixture.detectChanges();
      const [clientButton, serverButton] = getUsageModeButtons();
      expect(clientButton.getAttribute('aria-pressed')).toBe('true');
      expect(serverButton.getAttribute('aria-pressed')).toBe('false');

      serverButton.click();
      fixture.detectChanges();

      expect(clientButton.getAttribute('aria-pressed')).toBe('false');
      expect(serverButton.getAttribute('aria-pressed')).toBe('true');
      expect(usageCode()).toContain('mode="server"');
      expect(usageCode()).not.toContain('selectable');
    });

    it('clicking back to Client mode restores the client snippet', () => {
      fixture.detectChanges();
      const [clientButton, serverButton] = getUsageModeButtons();

      serverButton.click();
      fixture.detectChanges();
      clientButton.click();
      fixture.detectChanges();

      expect(clientButton.getAttribute('aria-pressed')).toBe('true');
      expect(serverButton.getAttribute('aria-pressed')).toBe('false');
      expect(usageCode()).not.toContain('mode="server"');
      expect(usageCode()).toContain('selectable');
    });

    it('the server snippet documents currentPage/sortState two way bindings and totalCount, the client one does not bind them', () => {
      fixture.detectChanges();
      const [, serverButton] = getUsageModeButtons();

      expect(usageCode()).not.toContain('[(currentPage)]');
      expect(usageCode()).not.toContain('[(sortState)]');

      serverButton.click();
      fixture.detectChanges();

      expect(usageCode()).toContain('[(currentPage)]');
      expect(usageCode()).toContain('[(sortState)]');
      expect(usageCode()).toContain('[totalCount]');
    });

    // Regression guard for the layout bug this replaces: a full
    // interface/@Component/class wrapper around the snippet pushed the
    // Usage panel far taller than its Edit columns/Edit data siblings
    // (CSS Grid's default align-items: stretch then pulled every panel
    // in the row up to match it). Both snippets must stay just the
    // import line plus the <lib-data-grid ... /> tag, same calibre as
    // form-builder-demo.ts/pdf-generator-demo.ts's own usageSnippet.
    it('the client snippet is a plain import plus tag, no wrapping interface/class/decorator boilerplate', () => {
      fixture.detectChanges();
      const code = usageCode();
      expect(code).not.toContain('interface User');
      expect(code).not.toContain('@Component');
      expect(code).not.toContain('class UsersComponent');
      expect(code.split('\n').length).toBeLessThanOrEqual(15);
    });

    it('the server snippet is also a plain import plus tag, no wrapping boilerplate or example methods', () => {
      fixture.detectChanges();
      const [, serverButton] = getUsageModeButtons();
      serverButton.click();
      fixture.detectChanges();

      const code = usageCode();
      expect(code).not.toContain('interface User');
      expect(code).not.toContain('@Component');
      expect(code).not.toContain('class UsersComponent');
      expect(code).not.toContain('effect(');
      expect(code.split('\n').length).toBeLessThanOrEqual(15);
    });
  });
});
