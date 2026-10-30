import { Routes } from '@angular/router';
import { Landing } from './landing/landing';

export const routes: Routes = [
  {
    path: '',
    component: Landing,
  },
  {
    path: 'docs',
    loadComponent: () => import('./docs/docs').then((m) => m.Docs),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'components/button' },
      {
        path: 'components/button',
        loadComponent: () => import('./docs/components/button-doc/button-doc').then((m) => m.ButtonDoc),
      },
    ],
  },
];
