import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth-guard';

/**
 * Lazy-loaded route configuration for the orders feature.
 *
 * Both routes require authentication via authGuard because the backend
 * restricts GET /orders and GET /orders/{id} to authenticated users.
 *
 * The list route renders the paginated order table with customer and
 * product filters. The detail route renders a full order card with embedded
 * customer and product data loaded from GET /orders/{id}.
 *
 * These routes are mounted under the 'orders' path in app.routes.ts inside
 * the authenticated shell, so they inherit the toolbar and sidenav layout.
 * The authGuard on each child route is a defense-in-depth measure; the parent
 * shell group also carries canActivate: [authGuard].
 */
export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    // loadComponent defers the bundle download until the user navigates here
    loadComponent: () =>
      import('./pages/order-list/order-list.page').then(
        (m) => m.OrderListPage,
      ),
  },
  {
    path: ':id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/order-detail/order-detail.page').then(
        (m) => m.OrderDetailPage,
      ),
  },
];
