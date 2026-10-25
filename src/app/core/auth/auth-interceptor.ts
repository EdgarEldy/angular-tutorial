import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { decodeJwt, isTokenValid } from './jwt';

/**
 * Attaches the JWT access token to every outgoing request that targets
 * the identity API or the business API.
 *
 * Reads the token directly from localStorage (rather than injecting
 * AuthService) to avoid a circular dependency: AuthService depends on
 * HttpClient at construction time, so injecting AuthService here would
 * create a cycle. Reading localStorage is intentionally bypassed for
 * requests that do not target our own APIs (e.g. CDNs or third-party calls).
 *
 * Token expiry is checked before attaching: if the token has already
 * expired there is no point adding it -- the server would respond with 401
 * anyway, but an expired token in the header can confuse some proxies.
 * The errorInterceptor downstream will catch the 401 and trigger the
 * standard UNAUTHENTICATED flow (clear session, redirect to /login).
 *
 * The Authorization header follows the Bearer scheme defined in RFC 6750.
 *
 * @param req - the outgoing HTTP request
 * @param next - the next handler in the interceptor chain
 * @returns the request observable, with an Authorization header when applicable
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return next(req);
  }

  // Only attach to requests that target our own backend APIs
  const isApiRequest =
    req.url.startsWith(environment.identityApiUrl) ||
    req.url.startsWith(environment.apiUrl);

  if (!isApiRequest) {
    return next(req);
  }

  // Skip expired tokens -- errorInterceptor will handle the resulting 401
  const claims = decodeJwt(token);
  if (!claims || !isTokenValid(claims)) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
