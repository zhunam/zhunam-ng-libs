import { ColumnConfig } from '@zhunam/data-grid';

export interface User {
  nombre: string;
  email: string;
  rol: string;
}

export const mockUsers: User[] = [
  { nombre: 'Ana Torres', email: 'ana@example.com', rol: 'Admin' },
  { nombre: 'Luis Pérez', email: 'luis@example.com', rol: 'Editor' },
  { nombre: 'Marta Ruiz', email: 'marta@example.com', rol: 'Viewer' },
];

export const userColumns: ColumnConfig<User>[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'email', label: 'Email' },
  { key: 'rol', label: 'Rol' },
];
