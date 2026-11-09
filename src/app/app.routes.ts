import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell/shell';
import { NotFoundComponent } from './features/not-found/not-found';
import { NotAllowedComponent } from './features/not-allowed/not-allowed';
import { authGuard } from './core/auth/auth-guard';

/**
 * Application route configuration.
 *
 * All authenticated feature routes are children of ShellComponent so they
 * share the toolbar + sidenav layout via its <router-outlet />.
 *
 * Auth routes (login, register, activate, forgot/reset password) are mounted
 * at the root level, outside the shell, so they render without the nav bar.
 * The profile route is inside the shell and behind authGuard.
 *
 * Lazy loading with loadChildren() / loadComponent() demonstrates code-splitting:
 * each feature module is downloaded only when the user first navigates to it.
 *
 * Route guards (authGuard, roleGuard) are wired here for the dashboard and
 * profile; feature-specific guards will be added in later branches.
 */
export const routes: Routes = [
  // Error pages (outside shell so they render without the nav)
  { path: 'not-allowed', component: NotAllowedComponent },
  { path: '404', component: NotFoundComponent },

  // Redirect the bare root to the default authenticated page.
  // Angular resolves this first (pathMatch: 'full' means exact '/' only),
  // then the shell's authGuard decides: authenticated users land on
  // /dashboard, unauthenticated users are redirected to /auth/login.
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Auth pages under /auth/** (outside shell -- no toolbar/sidenav)
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Authenticated shell
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard.page').then(
            (m) => m.DashboardPage,
          ),
      },

      // Categories (feature/categories branch)
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
      },

      // Products (feature/products branch)
      {
        path: 'products',
        loadComponent: () =>
          import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
      },

      // Customers (feature/customers branch)
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
      },

      // Orders (feature/orders branch)
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/not-found/not-found').then((m) => m.NotFoundComponent),
      },
    ],
  },

  // Wildcard -- must be last
  { path: '**', component: NotFoundComponent },
];
