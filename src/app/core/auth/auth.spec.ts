import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { Auth } from './auth';
import { environment } from '../../../environments/environment';

/** Builds a minimal valid JWT with the given claims payload. */
function buildJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  // Replace standard base64 chars with base64url chars
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${body}.sig`;
}

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;
const PAST_EXP = Math.floor(Date.now() / 1000) - 1;

const validToken = buildJwt({
  sub: 'test@example.com',
  roles: ['USER'],
  permissions: ['PRODUCT:READ'],
  exp: FUTURE_EXP,
  jti: 'abc123',
});

const expiredToken = buildJwt({
  sub: 'test@example.com',
  roles: ['ADMIN'],
  permissions: [],
  exp: PAST_EXP,
  jti: 'xyz789',
});

describe('Auth', () => {
  let service: Auth;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(Auth);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
    localStorage.clear();
  });

  // --------------------------------------------------------------------------
  // Initial state
  // --------------------------------------------------------------------------

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts unauthenticated when localStorage is empty', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  // --------------------------------------------------------------------------
  // storeToken / clearSession
  // --------------------------------------------------------------------------

  it('storeToken updates token signal and persists to localStorage', () => {
    service.storeToken(validToken);
    expect(service.token()).toBe(validToken);
    expect(localStorage.getItem('access_token')).toBe(validToken);
  });

  it('isAuthenticated is true after storing a valid token', () => {
    service.storeToken(validToken);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated is false for an expired token', () => {
    service.storeToken(expiredToken);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('clearSession removes token from signal and localStorage', () => {
    service.storeToken(validToken);
    service.clearSession();
    expect(service.token()).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Role / permission helpers
  // --------------------------------------------------------------------------

  it('hasRole is case-insensitive', () => {
    service.storeToken(validToken);
    expect(service.hasRole('user')).toBe(true);
    expect(service.hasRole('USER')).toBe(true);
    expect(service.hasRole('ADMIN')).toBe(false);
  });

  it('hasAnyRole returns true when at least one role matches', () => {
    service.storeToken(validToken);
    expect(service.hasAnyRole('ADMIN', 'USER')).toBe(true);
    expect(service.hasAnyRole('ADMIN')).toBe(false);
  });

  it('hasPermission is case-insensitive', () => {
    service.storeToken(validToken);
    expect(service.hasPermission('product:read')).toBe(true);
    expect(service.hasPermission('PRODUCT:READ')).toBe(true);
    expect(service.hasPermission('ORDER:WRITE')).toBe(false);
  });

  it('isAdmin is false for non-admin user', () => {
    service.storeToken(validToken);
    expect(service.isAdmin()).toBe(false);
  });

  // --------------------------------------------------------------------------
  // HTTP methods
  // --------------------------------------------------------------------------

  it('login stores the token and emits AuthResponse', (done) => {
    service
      .login({ email: 'a@b.com', password: 'secret123' })
      .subscribe((res) => {
        expect(res.token).toBe(validToken);
        expect(service.token()).toBe(validToken);
        done();
      });

    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/login`);
    req.flush({ success: true, message: 'OK', data: { token: validToken }, timestamp: '' });
  });

  it('register calls POST /auth/register and returns UserResponse', (done) => {
    const payload = {
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      password: 'password123',
    };
    const userStub = {
      id: 1,
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      enabled: false,
      account_locked: false,
      roles: [],
    };

    service.register(payload).subscribe((user) => {
      expect(user.email).toBe('jane@example.com');
      done();
    });

    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/register`);
    req.flush({ success: true, message: '', data: userStub, timestamp: '' });
  });

  it('logout clears session even when the backend returns an error', (done) => {
    service.storeToken(validToken);

    service.logout().subscribe(() => {
      expect(service.token()).toBeNull();
      done();
    });

    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/logout`);
    // Simulate a network failure
    req.error(new ProgressEvent('error'));
  });

  it('loadCurrentUser populates currentUser signal', (done) => {
    const userStub = {
      id: 42,
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@example.com',
      enabled: true,
      account_locked: false,
      roles: [],
    };

    service.loadCurrentUser().subscribe((user) => {
      expect(user).toEqual(userStub);
      expect(service.currentUser()).toEqual(userStub);
      done();
    });

    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/me`);
    req.flush({ success: true, message: '', data: userStub, timestamp: '' });
  });

  it('loadCurrentUser returns null and does not throw when the request fails', (done) => {
    service.loadCurrentUser().subscribe((user) => {
      expect(user).toBeNull();
      done();
    });

    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/me`);
    req.error(new ProgressEvent('error'));
  });
});
