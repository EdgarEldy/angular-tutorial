import { Routes } from '@angular/router';

/**
 * Routes for the users administration feature.
 *
 * Mounted under /users inside the shell, behind roleGuard with
 * data: { roles: ['ADMIN'] } set on the pathless parent route in app.routes.ts.
 */
export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/user-list/user-list.page').then((m) => m.UserListPage),
  },
];
