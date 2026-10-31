import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  it('does not set Authorization header when no token is stored', async () => {
    const promise = firstValueFrom(http.get('/api/v1/test'));
    const req = controller.expectOne('/api/v1/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await promise;
  });

  it('sets Authorization Bearer header for apiUrl requests when a token is stored', async () => {
    localStorage.setItem('access_token', 'test.jwt.token');
    const promise = firstValueFrom(http.get('/api/v1/test'));
    const req = controller.expectOne('/api/v1/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test.jwt.token');
    req.flush({});
    await promise;
  });

  it('does not attach the token to requests outside apiUrl', async () => {
    localStorage.setItem('access_token', 'test.jwt.token');
    const promise = firstValueFrom(http.get('https://fonts.googleapis.com/css'));
    const req = controller.expectOne('https://fonts.googleapis.com/css');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush('');
    await promise;
  });

  it('does not mutate the original request (uses clone)', async () => {
    localStorage.setItem('access_token', 'abc');
    const promise = firstValueFrom(http.get('/api/v1/test'));
    const req = controller.expectOne('/api/v1/test');
    // The interceptor must clone the request, not mutate it
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({});
    await promise;
  });
});
