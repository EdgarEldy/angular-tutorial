import { Routes } from '@angular/router';

/**
 * Routes for the categories feature.
 *
 * Mounted under /categories in app.routes.ts without any guard because
 * GET /categories and GET /categories/{id} are public endpoints. The ADMIN
 * actions (create, edit, delete) are hidden in the UI via *appHasRole and
 * enforced by the backend -- no route-level guard is needed here.
 *
 * Lazy loading with loadComponent() splits this feature into a separate
 * chunk downloaded only when the user first navigates to /categories.
 */
export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/category-list/category-list.page').then(
        (m) => m.CategoryListPage,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/category-detail/category-detail.page').then(
        (m) => m.CategoryDetailPage,
      ),
  },
];
