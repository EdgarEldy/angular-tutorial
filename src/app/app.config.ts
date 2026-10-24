import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth-interceptor';
import { errorInterceptor } from './core/http/error-interceptor';
import { Auth } from './core/auth/auth';

/**
 * Root application configuration.
 *
 * Interceptor order matters: authInterceptor runs first so the Authorization
 * header is set before errorInterceptor sees the response. Angular applies
 * HttpInterceptorFn functions in the order they appear in the array.
 *
 * provideAnimationsAsync() is the tree-shakable replacement for
 * BrowserAnimationsModule and is required by Angular Material components.
 *
 * provideAppInitializer() runs before the first route is activated. It
 * restores the session from localStorage: if a valid (non-expired) token is
 * found it calls loadCurrentUser() to confirm the token is still accepted by
 * the server and to populate the currentUser signal. A failed /auth/me call
 * clears the session silently rather than crashing the app -- Auth.loadCurrentUser
 * already handles that internally.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),

    // Session restore: runs once before the router activates any route.
    // provideAppInitializer accepts a factory function (not a class) that
    // returns a Promise or Observable. Angular waits for it to complete.
    provideAppInitializer(() => {
      const auth = inject(Auth);

      // AuthService reads the token from localStorage at construction time.
      // If the token is valid, confirm it with the server; otherwise clear it.
      if (auth.isAuthenticated()) {
        // firstValueFrom converts the observable to a Promise for the initializer
        return firstValueFrom(auth.loadCurrentUser());
      }

      // Token absent or expired -- clear silently and continue bootstrap
      auth.clearSession();
      return Promise.resolve(null);
    }),
  ],
};
