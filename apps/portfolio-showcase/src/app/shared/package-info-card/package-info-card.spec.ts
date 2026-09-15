import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PackageInfoCard } from './package-info-card';
import { LibraryEntry } from '../libraries';

describe('PackageInfoCard', () => {
  let fixture: ComponentFixture<PackageInfoCard>;

  const dataGrid: LibraryEntry = {
    name: 'Data Grid',
    importPath: '@zhunam/data-grid',
    description: 'Table with column sorting, pagination, and row selection.',
    route: '/data-grid',
    status: 'available',
    version: '2.0.0',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PackageInfoCard] }).compileComponents();
    fixture = TestBed.createComponent(PackageInfoCard);
    fixture.componentRef.setInput('library', dataGrid);
    fixture.detectChanges();
  });

  it('shows the real package name, version, and install command', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('@zhunam/data-grid');
    expect(nativeElement.textContent).toContain('v2.0.0');
    expect(nativeElement.textContent).toContain('npm i @zhunam/data-grid');
  });

  it('links to the real npm and GitHub pages for the library', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;
    const npmLink = nativeElement.querySelector('a[href="https://www.npmjs.com/package/@zhunam/data-grid"]');
    const githubLink = nativeElement.querySelector(
      'a[href="https://github.com/zhunam/zhunam-ng-libs/tree/master/libs/data-grid"]',
    );
    expect(npmLink).toBeTruthy();
    expect(githubLink).toBeTruthy();
  });
});
