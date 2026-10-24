import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from './auth';

/**
 * Functional route guard that enforces permission-based access control.
 *
 * Required permissions are declared on the route's data property in
 * RESOURCE:ACTION format:
 *
 *   { path: 'edit', canActivate: [permissionGuard], data: { permissions: ['PRODUCT:WRITE'] } }
 *
 * The guard checks each required permission against the JWT claims via
 * AuthService.hasPermission(), which is case-insensitive. Any single match
 * grants access so routes can list alternative permissions.
 *
 * Redirect rules:
 * - Not authenticated -> /login with returnUrl
 * - Authenticated but missing permission -> /not-allowed
 *
 * @param route - provides route.data['permissions'] with the required list
 * @param state - router state snapshot for capturing the attempted URL
 * @returns true, a /login UrlTree, or a /not-allowed UrlTree
 */
export const permissionGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Route data carries the required permissions; default to empty (guard is a no-op)
  const required: string[] = (route.data['permissions'] as string[]) ?? [];

  if (required.some((p) => auth.hasPermission(p))) {
    return true;
  }

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  return router.createUrlTree(['/not-allowed']);
};
