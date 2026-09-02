import { Route } from '@angular/router';
import { Home } from './pages/home/home';
import { DataGridDemo } from './pages/data-grid-demo/data-grid-demo';
import { FormBuilderDemo } from './pages/form-builder-demo/form-builder-demo';
import { AuthDemo } from './pages/auth-demo/auth-demo';
import { PdfGeneratorDemo } from './pages/pdf-generator-demo/pdf-generator-demo';

export const appRoutes: Route[] = [
  { path: '', component: Home },
  { path: 'data-grid', component: DataGridDemo },
  { path: 'form-builder', component: FormBuilderDemo },
  { path: 'auth', component: AuthDemo },
  { path: 'pdf-generator', component: PdfGeneratorDemo },
  {
    path: 'calendar',
    loadComponent: () => import('./pages/calendar-demo/calendar-demo').then((m) => m.CalendarDemo),
  },
];
