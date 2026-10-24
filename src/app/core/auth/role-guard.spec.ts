import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { roleGuard } from './role-guard';
import { Auth } from './auth';

/** Helper: build a minimal valid JWT with the given payload. */
function buildJwt(payload: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `h.${body}.s`;
}

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;

describe('roleGuard', () => {
  let auth: Auth;
  let router: Router;

  const executeGuard: CanActivateFn = (route, state) =>
    TestBed.runInInjectionContext(() => roleGuard(route, state));

  const makeRoute = (roles: string[]): ActivatedRouteSnapshot =>
    ({ data: { roles } }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(Auth);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  it('returns true when the user holds the required role', () => {
    auth.storeToken(buildJwt({ sub: 'u@e.com', roles: ['ADMIN'], permissions: [], exp: FUTURE_EXP, jti: 'x' }));
    const result = executeGuard(
      makeRoute(['ADMIN']),
      { url: '/admin' } as RouterStateSnapshot,
    );
    expect(result).toBe(true);
  });

  it('redirects to /not-allowed when authenticated but role is missing', () => {
    auth.storeToken(buildJwt({ sub: 'u@e.com', roles: ['USER'], permissions: [], exp: FUTURE_EXP, jti: 'x' }));
    const result = executeGuard(
      makeRoute(['ADMIN']),
      { url: '/admin' } as RouterStateSnapshot,
    ) as UrlTree;
    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toContain('/not-allowed');
  });

  it('redirects to /login when unauthenticated', () => {
    const result = executeGuard(
      makeRoute(['ADMIN']),
      { url: '/admin' } as RouterStateSnapshot,
    ) as UrlTree;
    expect(result.toString()).toContain('/login');
    expect(result.queryParams['returnUrl']).toBe('/admin');
  });
});
