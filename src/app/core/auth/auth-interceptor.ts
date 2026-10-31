import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { decodeJwt, isTokenValid } from './jwt';

/**
 * Attaches the JWT access token to outgoing requests that target the backend API.
 *
 * Reads the token from localStorage under the key 'access_token'. If no token
 * is present, or the request does not target environment.apiUrl, the request is
 * forwarded unmodified. Public endpoints (login, register, forgot-password) are
 * still reachable because they live under apiUrl but the server does not require
 * a token for them.
 *
 * Token expiry is checked before attaching: if the token has already expired
 * there is no point adding it -- the server would respond with 401 anyway, but an
 * expired token in the header can confuse some proxies. The errorInterceptor
 * downstream will catch the 401 and trigger the standard UNAUTHENTICATED flow
 * (clear session, redirect to /login).
 *
 * Restricting the header to apiUrl prevents the token from leaking to CDNs or
 * third-party services that an interceptor chain might reach.
 *
 * AuthService is intentionally not injected here to avoid a circular dependency:
 * AuthService depends on HttpClient, so injecting it inside an HttpInterceptorFn
 * would create a cycle at bootstrap time. Reading localStorage directly is the
 * standard workaround for this pattern.
 *
 * The Authorization header follows the Bearer scheme defined by RFC 6750.
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

  // Only attach to requests that target our own backend API
  if (!req.url.startsWith(environment.apiUrl)) {
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
