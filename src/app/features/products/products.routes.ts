import { Routes } from '@angular/router';

/**
 * Routes for the products feature.
 *
 * Mounted under /products in app.routes.ts inside the public shell group
 * (no canActivate guard) because GET /products is a public endpoint. The ADMIN
 * actions (create, edit, delete) are hidden in the UI via *appHasRole and
 * enforced by the backend -- no route-level guard is needed here.
 *
 * Lazy loading with loadComponent() splits this feature into a separate
 * chunk downloaded only when the user first navigates to /products.
 */
export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/product-list/product-list.page').then(
        (m) => m.ProductListPage,
      ),
  },
];
