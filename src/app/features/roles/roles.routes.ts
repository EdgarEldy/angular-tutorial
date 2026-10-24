import { Routes } from '@angular/router';

/**
 * Routes for the roles administration feature.
 *
 * Mounted under /admin/roles inside the shell, behind roleGuard with
 * data: { roles: ['ADMIN'] } set on the parent route in app.routes.ts.
 */
export const ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/role-list/role-list.page').then((m) => m.RoleListPage),
  },
];
