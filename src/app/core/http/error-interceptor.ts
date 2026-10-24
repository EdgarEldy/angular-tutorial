import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { mapHttpError } from './error-mapper';

/**
 * Translates every HttpErrorResponse into a typed AppError.
 *
 * Sits at the end of the interceptor chain so it sees errors from all other
 * interceptors and from the actual HTTP call. Components and services receive
 * AppError (not HttpErrorResponse) in their catchError / error signal, and
 * switch on AppError.kind to decide what to display.
 *
 * Does NOT navigate or show toasts here – that responsibility belongs to
 * components or a NotificationService. Keeping side effects out of the
 * interceptor makes it easy to test and keeps it focused on one concern.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        return throwError(() => mapHttpError(err));
      }
      // Re-throw anything that is not an HTTP error unchanged
      return throwError(() => err);
    }),
  );
};
