import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from './auth';

/**
 * Functional route guard that enforces role-based access control.
 *
 * Required roles are declared on the route's data property:
 *
 *   { path: 'admin', canActivate: [roleGuard], data: { roles: ['ADMIN'] } }
 *
 * The guard checks each required role against the JWT claims via
 * AuthService.hasRole(), which is case-insensitive. If any role matches,
 * the user is allowed through.
 *
 * Redirect rules:
 * - Not authenticated -> /login with returnUrl (session expired or cold visit)
 * - Authenticated but missing role -> /not-allowed (clear access denial)
 *
 * @param route - provides route.data['roles'] with the required role list
 * @param state - router state snapshot for capturing the attempted URL
 * @returns true, a /login UrlTree, or a /not-allowed UrlTree
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Route data carries the required roles; default to empty (guard is a no-op)
  const required: string[] = (route.data['roles'] as string[]) ?? [];

  if (required.some((r) => auth.hasRole(r))) {
    return true;
  }

  if (!auth.isAuthenticated()) {
    // Not logged in -- redirect to login with return URL
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  // Logged in but lacks the required role
  return router.createUrlTree(['/not-allowed']);
};
