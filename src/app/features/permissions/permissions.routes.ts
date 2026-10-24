import { Routes } from '@angular/router';

/**
 * Routes for the permissions administration feature.
 *
 * Mounted under /admin/permissions inside the shell, behind roleGuard with
 * data: { roles: ['ADMIN'] } set on the parent route in app.routes.ts.
 */
export const PERMISSIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/permission-list/permission-list.page').then(
        (m) => m.PermissionListPage,
      ),
  },
];
