import { Route } from '@angular/router';
import { Home } from './pages/home/home';
import { DataGridDemo } from './pages/data-grid-demo/data-grid-demo';

export const appRoutes: Route[] = [
  { path: '', component: Home },
  { path: 'data-grid', component: DataGridDemo },
];
