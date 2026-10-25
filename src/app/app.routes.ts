import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell/shell';
import { NotFoundComponent } from './features/not-found/not-found';
import { NotAllowedComponent } from './features/not-allowed/not-allowed';
import { authGuard } from './core/auth/auth-guard';
import { roleGuard } from './core/auth/role-guard';

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
 * Public features (categories, products) use a second shell group without
 * any guard so unauthenticated visitors can read them. Angular's router
 * tries route groups in order and backtracks when no children match, so
 * the public shell handles /categories and the authenticated shell handles
 * everything else.
 *
 * Lazy loading with loadChildren() / loadComponent() demonstrates code-splitting:
 * each feature module is downloaded only when the user first navigates to it.
 */
export const routes: Routes = [
  // Error pages (outside shell so they render without the nav)
  { path: 'not-allowed', component: NotAllowedComponent },
  { path: '404', component: NotFoundComponent },

  // Auth pages (outside shell -- no toolbar/sidenav for login, register, etc.)
  {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Public shell: categories (and products in feature/products) are readable
  // by any visitor. The shell still renders the nav bar so the user can
  // navigate to other areas. No canActivate guard on this group.
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: 'categories',
        loadChildren: () =>
          import('./features/categories/categories.routes').then(
            (m) => m.CATEGORIES_ROUTES,
          ),
      },
      // Products: public (no guard), lazy-loaded feature routes
      {
        path: 'products',
        loadChildren: () =>
          import('./features/products/products.routes').then(
            (m) => m.PRODUCTS_ROUTES,
          ),
      },
    ],
  },

  // Authenticated shell: everything behind authGuard
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Dashboard stub (feature/dashboard branch)
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/not-found/not-found').then(
            (m) => m.NotFoundComponent,
          ),
      },

      // Customers (feature/customers branch) -- behind authGuard on each child route
      {
        path: 'customers',
        loadChildren: () =>
          import('./features/customers/customers.routes').then(
            (m) => m.CUSTOMERS_ROUTES,
          ),
      },

      // Orders (feature/orders branch) -- behind authGuard on each child route
      {
        path: 'orders',
        loadChildren: () =>
          import('./features/orders/orders.routes').then(
            (m) => m.ORDERS_ROUTES,
          ),
      },

      // Administration area: ADMIN role required for all /admin/* routes
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        children: [
          { path: '', redirectTo: 'users', pathMatch: 'full' },
          {
            path: 'users',
            loadChildren: () =>
              import('./features/users/users.routes').then(
                (m) => m.USERS_ROUTES,
              ),
          },
          {
            path: 'roles',
            loadChildren: () =>
              import('./features/roles/roles.routes').then(
                (m) => m.ROLES_ROUTES,
              ),
          },
          {
            path: 'permissions',
            loadChildren: () =>
              import('./features/permissions/permissions.routes').then(
                (m) => m.PERMISSIONS_ROUTES,
              ),
          },
        ],
      },
    ],
  },

  // Wildcard -- must be last
  { path: '**', component: NotFoundComponent },
];
