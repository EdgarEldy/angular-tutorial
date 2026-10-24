import { TestBed } from '@angular/core/testing';
import { CanActivateFn, RouterStateSnapshot, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { authGuard } from './auth-guard';
import { Auth } from './auth';

describe('authGuard', () => {
  let auth: Auth;

  const executeGuard: CanActivateFn = (route, state) =>
    TestBed.runInInjectionContext(() => authGuard(route, state));

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    auth = TestBed.inject(Auth);
  });

  afterEach(() => localStorage.clear());

  it('returns true when the user is authenticated', () => {
    // Build a token that expires in the future
    const payload = { sub: 'u@e.com', roles: [], permissions: [], exp: Math.floor(Date.now() / 1000) + 3600, jti: 'x' };
    const token = `h.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.s`;
    auth.storeToken(token);

    const result = executeGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/profile' } as RouterStateSnapshot,
    );

    expect(result).toBe(true);
  });

  it('redirects to /login with returnUrl when unauthenticated', () => {
    const result = executeGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/profile' } as RouterStateSnapshot,
    ) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toContain('/login');
    expect(result.queryParams['returnUrl']).toBe('/profile');
  });
});
