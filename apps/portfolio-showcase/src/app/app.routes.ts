import { Route } from '@angular/router';
import { Home } from './pages/home/home';
import { DataGridDemo } from './pages/data-grid-demo/data-grid-demo';
import { FormBuilderDemo } from './pages/form-builder-demo/form-builder-demo';
import { AuthDemo } from './pages/auth-demo/auth-demo';
import { PdfGeneratorDemo } from './pages/pdf-generator-demo/pdf-generator-demo';
import { NotFound } from './pages/not-found/not-found';

export const appRoutes: Route[] = [
  { path: '', component: Home, title: 'Home' },
  { path: 'data-grid', component: DataGridDemo, title: 'Data Grid' },
  { path: 'form-builder', component: FormBuilderDemo, title: 'Form Builder' },
  { path: 'auth', component: AuthDemo, title: 'Auth' },
  { path: 'pdf-generator', component: PdfGeneratorDemo, title: 'PDF Generator' },
  {
    path: 'calendar',
    loadComponent: () => import('./pages/calendar-demo/calendar-demo').then((m) => m.CalendarDemo),
    title: 'Calendar',
  },
  {
    path: 'crypto-dashboard',
    loadComponent: () =>
      import('./pages/crypto-dashboard/crypto-dashboard').then((m) => m.CryptoDashboard),
    title: 'Crypto Market Dashboard',
  },
  { path: '**', component: NotFound, title: 'Page not found' },
];
