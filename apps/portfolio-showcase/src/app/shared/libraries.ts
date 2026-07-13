export interface LibraryEntry {
  name: string;
  importPath: string;
  description: string;
  route: string | null;
  status: 'available' | 'coming-soon';
}

/** Sourced from the root ROADMAP.md phase list — no invented libraries or version numbers. */
export const libraries: LibraryEntry[] = [
  {
    name: 'Data Grid',
    importPath: '@zhunam/data-grid',
    description: 'Table with column sorting, pagination, and row selection.',
    route: '/data-grid',
    status: 'available',
  },
  
];

/** The only library with a real demo today — referenced directly where a single entry is needed. */
export const dataGridLibrary = libraries[0];
