import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth-interceptor';
import { errorInterceptor } from './core/http/error-interceptor';

/**
 * Root application configuration.
 *
 * Interceptor order matters: authInterceptor runs first so the Authorization
 * header is set before errorInterceptor sees the response. Angular applies
 * HttpInterceptorFn functions in the order they appear in the array.
 *
 * provideAnimationsAsync() is the tree-shakable replacement for
 * BrowserAnimationsModule and is required by Angular Material components.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ],
};
