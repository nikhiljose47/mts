import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'market', pathMatch: 'full' },
  {
    path: 'market',
    loadComponent: () =>
      import('./features/market/market.component').then((m) => m.MarketComponent),
  },
  {
    path: 'browser',
    loadComponent: () =>
      import('./features/browser/browser.component').then((m) => m.BrowserComponent),
  },
];
