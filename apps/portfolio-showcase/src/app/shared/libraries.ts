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
  {
    name: 'PDF Generator',
    importPath: '@zhunam/pdf-generator',
    description: 'Client-side PDF documents from a declarative, typed template, with a live preview component.',
    route: '/pdf-generator',
    status: 'available',
  },
];

/**
 * Looks up a `LibraryEntry` by its `importPath`, never by a fixed array
 * index: `libraries` is the source of truth for order, and a numeric
 * index would silently point at the wrong entry the moment that order
 * changes (e.g. a library gets removed, or the list gets reordered).
 */
function requireLibrary(importPath: string): LibraryEntry {
  const found = libraries.find((library) => library.importPath === importPath);
  if (!found) {
    throw new Error(`No LibraryEntry found for importPath "${importPath}".`);
  }
  return found;
}

/** Referenced directly on the home page, where each library gets its own named card. */
export const dataGridLibrary = requireLibrary('@zhunam/data-grid');
export const formBuilderLibrary = requireLibrary('@zhunam/form-builder');
export const authLibrary = requireLibrary('@zhunam/auth');
export const pdfGeneratorLibrary = requireLibrary('@zhunam/pdf-generator');
