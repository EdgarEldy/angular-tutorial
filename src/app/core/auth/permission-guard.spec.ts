import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { permissionGuard } from './permission-guard';
import { Auth } from './auth';

function buildJwt(payload: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `h.${body}.s`;
}

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;

describe('permissionGuard', () => {
  let auth: Auth;

  const executeGuard: CanActivateFn = (route, state) =>
    TestBed.runInInjectionContext(() => permissionGuard(route, state));

  const makeRoute = (permissions: string[]): ActivatedRouteSnapshot =>
    ({ data: { permissions } }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(Auth);
  });

  afterEach(() => localStorage.clear());

  it('returns true when the user holds the required permission', () => {
    auth.storeToken(buildJwt({ sub: 'u@e.com', roles: [], permissions: ['PRODUCT:WRITE'], exp: FUTURE_EXP, jti: 'x' }));
    const result = executeGuard(
      makeRoute(['PRODUCT:WRITE']),
      { url: '/products/edit' } as RouterStateSnapshot,
    );
    expect(result).toBe(true);
  });

  it('is case-insensitive for permission matching', () => {
    auth.storeToken(buildJwt({ sub: 'u@e.com', roles: [], permissions: ['PRODUCT:WRITE'], exp: FUTURE_EXP, jti: 'x' }));
    const result = executeGuard(
      makeRoute(['product:write']),
      { url: '/products/edit' } as RouterStateSnapshot,
    );
    expect(result).toBe(true);
  });

  it('redirects to /not-allowed when authenticated but permission is missing', () => {
    auth.storeToken(buildJwt({ sub: 'u@e.com', roles: [], permissions: ['PRODUCT:READ'], exp: FUTURE_EXP, jti: 'x' }));
    const result = executeGuard(
      makeRoute(['PRODUCT:WRITE']),
      { url: '/products/edit' } as RouterStateSnapshot,
    ) as UrlTree;
    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toContain('/not-allowed');
  });

  it('redirects to /login when unauthenticated', () => {
    const result = executeGuard(
      makeRoute(['PRODUCT:WRITE']),
      { url: '/products/edit' } as RouterStateSnapshot,
    ) as UrlTree;
    expect(result.toString()).toContain('/login');
    expect(result.queryParams['returnUrl']).toBe('/products/edit');
  });
});
