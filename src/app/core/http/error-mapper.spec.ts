import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { mapHttpError } from './error-mapper';
import { ValidationError } from './app-error.model';

function makeError(status: number, body?: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, url: '/api/test' });
}

function makeApiError(status: number, detail: string, fieldErrors?: Record<string, string>) {
  return makeError(status, {
    success: false,
    message: detail,
    data: { title: 'Error', status, detail, instance: '/api/test', fieldErrors },
  });
}

describe('mapHttpError', () => {
  it('maps status 0 to NETWORK', () => {
    const err = mapHttpError(makeError(0));
    expect(err.kind).toBe('NETWORK');
    expect(err.status).toBe(0);
  });

  it('maps status 400 to VALIDATION with empty fieldErrors when absent', () => {
    const err = mapHttpError(makeApiError(400, 'Validation failed'));
    expect(err.kind).toBe('VALIDATION');
    expect(err.status).toBe(400);
    expect((err as ValidationError).fieldErrors).toEqual({});
  });

  it('maps status 400 to VALIDATION and populates fieldErrors', () => {
    const err = mapHttpError(
      makeApiError(400, 'Validation failed', { email: 'Invalid email' }),
    );
    expect(err.kind).toBe('VALIDATION');
    expect((err as ValidationError).fieldErrors).toEqual({ email: 'Invalid email' });
  });

  it('maps status 401 to UNAUTHENTICATED', () => {
    const err = mapHttpError(makeError(401));
    expect(err.kind).toBe('UNAUTHENTICATED');
    expect(err.status).toBe(401);
  });

  it('maps status 403 to FORBIDDEN', () => {
    const err = mapHttpError(makeError(403));
    expect(err.kind).toBe('FORBIDDEN');
  });

  it('maps status 404 to NOT_FOUND', () => {
    const err = mapHttpError(makeError(404));
    expect(err.kind).toBe('NOT_FOUND');
  });

  it('maps status 409 to CONFLICT', () => {
    const err = mapHttpError(makeApiError(409, 'Email already exists'));
    expect(err.kind).toBe('CONFLICT');
    expect(err.message).toBe('Email already exists');
  });

  it('maps status 422 to BUSINESS_RULE', () => {
    const err = mapHttpError(makeApiError(422, 'Insufficient stock'));
    expect(err.kind).toBe('BUSINESS_RULE');
  });

  it('maps status 500 to SERVER', () => {
    const err = mapHttpError(makeError(500));
    expect(err.kind).toBe('SERVER');
    expect(err.status).toBe(500);
  });

  it('maps unexpected status (e.g. 418) to SERVER', () => {
    const err = mapHttpError(makeError(418));
    expect(err.kind).toBe('SERVER');
  });

  it('uses fallback message when body is null', () => {
    const err = mapHttpError(makeError(503, null));
    expect(err.kind).toBe('SERVER');
    expect(err.message).toBeTruthy();
  });

  it('uses fallback message when body is a plain string', () => {
    const err = mapHttpError(makeError(400, 'Bad request'));
    expect(err.kind).toBe('VALIDATION');
    expect((err as ValidationError).fieldErrors).toEqual({});
  });
});
