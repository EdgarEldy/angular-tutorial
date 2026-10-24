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

import { authInterceptor } from './auth-interceptor';
import { environment } from '../../../environments/environment';

function buildJwt(payload: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `h.${body}.s`;
}

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;
const PAST_EXP = Math.floor(Date.now() / 1000) - 1;

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
    localStorage.clear();
  });

  it('does not add Authorization header when no token is stored', async () => {
    const req$ = firstValueFrom(http.get(`${environment.identityApiUrl}/auth/me`));
    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/me`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await req$;
  });

  it('adds Authorization header for identity API requests with a valid token', async () => {
    const token = buildJwt({ sub: 'u@e.com', roles: [], permissions: [], exp: FUTURE_EXP, jti: 'x' });
    localStorage.setItem('access_token', token);

    const req$ = firstValueFrom(http.get(`${environment.identityApiUrl}/auth/me`));
    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/me`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
    await req$;
  });

  it('adds Authorization header for business API requests with a valid token', async () => {
    const token = buildJwt({ sub: 'u@e.com', roles: [], permissions: [], exp: FUTURE_EXP, jti: 'x' });
    localStorage.setItem('access_token', token);

    const req$ = firstValueFrom(http.get(`${environment.apiUrl}/products`));
    const req = httpCtrl.expectOne(`${environment.apiUrl}/products`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
    await req$;
  });

  it('does not add Authorization header when the token is expired', async () => {
    const token = buildJwt({ sub: 'u@e.com', roles: [], permissions: [], exp: PAST_EXP, jti: 'x' });
    localStorage.setItem('access_token', token);

    const req$ = firstValueFrom(http.get(`${environment.identityApiUrl}/auth/me`));
    const req = httpCtrl.expectOne(`${environment.identityApiUrl}/auth/me`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await req$;
  });

  it('does not add Authorization header for non-API requests', async () => {
    const token = buildJwt({ sub: 'u@e.com', roles: [], permissions: [], exp: FUTURE_EXP, jti: 'x' });
    localStorage.setItem('access_token', token);

    const req$ = firstValueFrom(http.get('https://cdn.example.com/image.png'));
    const req = httpCtrl.expectOne('https://cdn.example.com/image.png');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush('data');
    await req$;
  });
});
