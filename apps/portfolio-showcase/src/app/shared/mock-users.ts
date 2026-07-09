import { ColumnConfig } from '@zhunam/data-grid';

export interface User {
  name: string;
  email: string;
  role: string;
}

export const mockUsers: User[] = [
  { name: 'Ana Torres', email: 'ana@example.com', role: 'Admin' },
  { name: 'Luis Pérez', email: 'luis@example.com', role: 'Editor' },
  { name: 'cuis Pérez', email: 'vuis@example.com', role: 'sditor' },
  { name: 'Marta Ruiz', email: 'marta@example.com', role: 'Viewer' },
];

export const userColumns: ColumnConfig<User>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
];
