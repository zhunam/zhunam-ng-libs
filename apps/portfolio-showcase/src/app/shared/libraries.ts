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
    description: 'Tabla con orden por columna, paginación y selección de fila.',
    route: '/data-grid',
    status: 'available',
  },
  {
    name: 'Form Builder',
    importPath: '@zhunam/form-builder',
    description: 'Formularios dinámicos con validación declarativa.',
    route: null,
    status: 'coming-soon',
  },
  {
    name: 'Auth',
    importPath: '@zhunam/auth',
    description: 'Wrapper de autenticación sobre Firebase/Supabase.',
    route: null,
    status: 'coming-soon',
  },
  {
    name: 'PDF Generator',
    importPath: '@zhunam/pdf-generator',
    description: 'Generación de documentos PDF del lado del cliente.',
    route: null,
    status: 'coming-soon',
  },
];
