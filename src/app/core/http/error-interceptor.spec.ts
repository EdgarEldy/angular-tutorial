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
import { errorInterceptor } from './error-interceptor';
import { AppError } from './app-error.model';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it('passes through successful responses unchanged', async () => {
    const result$ = http.get('/api/test');
    const promise = firstValueFrom(result$);
    controller.expectOne('/api/test').flush({ ok: true });
    const res = await promise;
    expect(res).toEqual({ ok: true });
  });

  it('converts HttpErrorResponse to AppError on 400', async () => {
    const promise = firstValueFrom(http.get('/api/test')).catch((err: AppError) => err);
    controller.expectOne('/api/test').flush(
      { success: false, message: 'Bad request', data: { title: 'Bad request', status: 400, detail: 'Bad request', instance: '/api/test' } },
      { status: 400, statusText: 'Bad Request' },
    );
    const err = (await promise) as AppError;
    expect(err.kind).toBe('VALIDATION');
    expect(err.status).toBe(400);
  });

  it('converts HttpErrorResponse to AppError on 401', async () => {
    const promise = firstValueFrom(http.get('/api/test')).catch((err: AppError) => err);
    controller.expectOne('/api/test').flush(null, { status: 401, statusText: 'Unauthorized' });
    const err = (await promise) as AppError;
    expect(err.kind).toBe('UNAUTHENTICATED');
  });

  it('converts HttpErrorResponse to AppError on 500', async () => {
    const promise = firstValueFrom(http.get('/api/test')).catch((err: AppError) => err);
    controller.expectOne('/api/test').flush(null, { status: 500, statusText: 'Server Error' });
    const err = (await promise) as AppError;
    expect(err.kind).toBe('SERVER');
    expect(err.status).toBe(500);
  });
});
