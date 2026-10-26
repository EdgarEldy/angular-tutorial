import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth-guard';

/**
 * Routes for the authentication feature.
 *
 * These routes are lazy-loaded from app.routes.ts so the auth bundle is
 * only downloaded when the user first navigates to /login, /register, etc.
 * Unauthenticated pages (login, register, activate, forgot, reset) are
 * accessible without any guard. The profile page requires a valid session.
 *
 * The AUTH_ROUTES constant is exported as a named export (not default) to
 * make the lazy import explicit:
 *   loadChildren: () => import('./auth.routes').then(m => m.AUTH_ROUTES)
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'activate-account',
    loadComponent: () =>
      import('./pages/activate-account/activate-account.page').then(
        (m) => m.ActivateAccountPage,
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then(
        (m) => m.ResetPasswordPage,
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile.page').then((m) => m.ProfilePage),
  },
];
