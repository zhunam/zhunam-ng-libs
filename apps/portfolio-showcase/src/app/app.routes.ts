import { Route } from '@angular/router';
import { Home } from './pages/home/home';
import { DataGridDemo } from './pages/data-grid-demo/data-grid-demo';
import { FormBuilderDemo } from './pages/form-builder-demo/form-builder-demo';
import { AuthDemo } from './pages/auth-demo/auth-demo';

export const appRoutes: Route[] = [
  { path: '', component: Home },
  { path: 'data-grid', component: DataGridDemo },
  { path: 'form-builder', component: FormBuilderDemo },
  { path: 'auth', component: AuthDemo },
];
