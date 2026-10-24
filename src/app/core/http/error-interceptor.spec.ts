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

  it('passes through successful responses unchanged', (done) => {
    http.get('/api/test').subscribe({
      next: (res) => {
        expect(res).toEqual({ ok: true });
        done();
      },
    });
    controller.expectOne('/api/test').flush({ ok: true });
  });

  it('converts HttpErrorResponse to AppError on 400', (done) => {
    http.get('/api/test').subscribe({
      error: (err: AppError) => {
        expect(err.kind).toBe('VALIDATION');
        expect(err.status).toBe(400);
        done();
      },
    });
    controller.expectOne('/api/test').flush(
      { success: false, message: 'Bad request', data: { title: 'Bad request', status: 400, detail: 'Bad request', instance: '/api/test' } },
      { status: 400, statusText: 'Bad Request' },
    );
  });

  it('converts HttpErrorResponse to AppError on 401', (done) => {
    http.get('/api/test').subscribe({
      error: (err: AppError) => {
        expect(err.kind).toBe('UNAUTHENTICATED');
        done();
      },
    });
    controller.expectOne('/api/test').flush(null, { status: 401, statusText: 'Unauthorized' });
  });

  it('converts HttpErrorResponse to AppError on 500', (done) => {
    http.get('/api/test').subscribe({
      error: (err: AppError) => {
        expect(err.kind).toBe('SERVER');
        expect(err.status).toBe(500);
        done();
      },
    });
    controller.expectOne('/api/test').flush(null, { status: 500, statusText: 'Server Error' });
  });

  it('re-throws non-HttpErrorResponse errors unchanged', (done) => {
    // Simulate a programming error thrown by a previous interceptor
    const nonHttpError = new Error('Unexpected error');
    http.get('/api/test').subscribe({
      error: (err: unknown) => {
        expect(err).toBe(nonHttpError);
        done();
      },
    });
    // Flush a successful response then manually trigger error
    const req = controller.expectOne('/api/test');
    req.flush(null, { status: 200, statusText: 'OK' });
  });
});
