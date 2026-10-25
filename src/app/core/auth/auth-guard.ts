import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from './auth';

/**
 * Functional route guard that requires an authenticated session.
 *
 * Reads the isAuthenticated computed signal from AuthService. Because signals
 * are synchronous, the guard returns a UrlTree immediately -- no observable or
 * promise is needed, which keeps navigation snappy.
 *
 * When the user is not authenticated, the guard redirects to /login and passes
 * the attempted URL as a returnUrl query parameter. After a successful login
 * the LoginPage reads that parameter and navigates back to the original page,
 * giving the user a seamless experience.
 *
 * @param route - the activated route snapshot (unused; kept for CanActivateFn signature)
 * @param state - the router state snapshot, used to capture the attempted URL
 * @returns true to proceed, or a UrlTree to redirect to /login
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Preserve the attempted URL so login can redirect back after success
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
