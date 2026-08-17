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
  {
    name: 'Form Builder',
    importPath: '@zhunam/form-builder',
    description: 'Dynamic reactive forms from a declarative field configuration.',
    route: '/form-builder',
    status: 'available',
  },
  {
    name: 'Auth',
    importPath: '@zhunam/auth',
    description: 'Unified wrapper over Firebase Auth and Supabase Auth, with a route guard and ready-made forms.',
    route: '/auth',
    status: 'available',
  },
];

/** Referenced directly on the home page, where each library gets its own named card. */
export const dataGridLibrary = libraries[0];
export const formBuilderLibrary = libraries[1];
export const authLibrary = libraries[2];
