import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth-guard';

/**
 * Routes for the customers feature.
 *
 * Mounted under /customers in app.routes.ts. Both routes require the user
 * to be authenticated via authGuard because GET /api/v1/customers and
 * GET /api/v1/customers/{id} are authenticated endpoints (not public like
 * categories and products).
 *
 * ADMIN-only write operations (create, edit, delete) are hidden with
 * *appHasRole directives in the pages and enforced by the backend; they do
 * not need a separate route guard.
 *
 * Lazy loading with loadComponent() splits each page into a separate chunk
 * downloaded only when the user first navigates to it.
 */
export const CUSTOMERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/customer-list/customer-list.page').then(
        (m) => m.CustomerListPage,
      ),
  },
  {
    path: ':id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/customer-detail/customer-detail.page').then(
        (m) => m.CustomerDetailPage,
      ),
  },
];
