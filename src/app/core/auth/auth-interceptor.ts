import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Attaches the JWT access token to every outgoing request.
 *
 * Reads the token from localStorage under the key 'access_token'. If no
 * token is present the request is forwarded unmodified – public endpoints
 * (login, register, forgot-password) must remain reachable without a token.
 *
 * The AuthService is responsible for storing and clearing the token; this
 * interceptor only reads it. Using localStorage avoids an inject() cycle
 * between AuthService and HttpClient at bootstrap time.
 *
 * The Authorization header follows the Bearer scheme defined by RFC 6750.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
