import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell/shell';
import { NotFoundComponent } from './features/not-found/not-found';
import { NotAllowedComponent } from './features/not-allowed/not-allowed';

/**
 * Application route configuration.
 *
 * All authenticated feature routes are children of ShellComponent so they
 * share the toolbar + sidenav layout via its <router-outlet />.
 *
 * Lazy loading with loadComponent() demonstrates code-splitting: each feature
 * module is only downloaded when the user first navigates to it. The imports
 * use the Angular 17+ default export pattern (the component class is the
 * default export).
 *
 * Route guards (authGuard, roleGuard) will be added in feature/auth and
 * feature/rbac branches. The stubs below mark the canActivate slots with
 * comments so the guard wiring is easy to find.
 */
export const routes: Routes = [
  // Error pages (outside shell so they render without the nav)
  { path: 'not-allowed', component: NotAllowedComponent },
  { path: '404', component: NotFoundComponent },

  // Authenticated shell
  {
    path: '',
    component: ShellComponent,
    children: [
      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Dashboard stub (feature/dashboard branch)
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
        // canActivate: [authGuard]  -- wired in feature/auth
      },

      // Categories (feature/categories branch)
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
        // canActivate: [authGuard]
      },

      // Products (feature/products branch)
      {
        path: 'products',
        loadComponent: () =>
          import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
        // canActivate: [authGuard]
      },

      // Customers (feature/customers branch)
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
        // canActivate: [authGuard]
      },

      // Orders (feature/orders branch)
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
        // canActivate: [authGuard]
      },
    ],
  },

  // Wildcard – must be last
  { path: '**', component: NotFoundComponent },
];
