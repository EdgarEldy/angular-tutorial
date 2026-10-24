import { HttpErrorResponse } from '@angular/common/http';
import {
  AppError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NetworkError,
  NotFoundError,
  ServerError,
  UnauthenticatedError,
  ValidationError,
} from './app-error.model';
import { ProblemDetail } from '../../shared/models/problem-detail.model';
import { ApiResponse } from '../../shared/models/api-response.model';

/**
 * Converts an Angular HttpErrorResponse into a typed AppError.
 *
 * The backends return errors wrapped in ApiResponse<ProblemDetail>. This
 * function extracts the ProblemDetail from the envelope when available and
 * falls back to reasonable defaults for network-level failures (status 0)
 * and unexpected non-JSON bodies.
 *
 * Usage (in an interceptor):
 *   catchError((err: HttpErrorResponse) => throwError(() => mapHttpError(err)))
 *
 * @param err - The raw Angular HTTP error response.
 * @returns A typed AppError discriminated by kind.
 */
export function mapHttpError(err: HttpErrorResponse): AppError {
  // status 0 means no network response at all (DNS failure, CORS abort, offline)
  if (err.status === 0) {
    const network: NetworkError = {
      kind: 'NETWORK',
      message: 'Network error – check your connection and try again.',
      status: 0,
    };
    return network;
  }

  const problem = extractProblemDetail(err);
  const message = problem?.detail ?? err.message ?? 'An unexpected error occurred.';

  switch (err.status) {
    case 400: {
      const validation: ValidationError = {
        kind: 'VALIDATION',
        message,
        status: 400,
        fieldErrors: problem?.fieldErrors ?? {},
      };
      return validation;
    }
    case 401: {
      const unauth: UnauthenticatedError = {
        kind: 'UNAUTHENTICATED',
        message: problem?.detail ?? 'Your session has expired. Please log in again.',
        status: 401,
      };
      return unauth;
    }
    case 403: {
      const forbidden: ForbiddenError = {
        kind: 'FORBIDDEN',
        message: problem?.detail ?? 'You do not have permission to perform this action.',
        status: 403,
      };
      return forbidden;
    }
    case 404: {
      const notFound: NotFoundError = {
        kind: 'NOT_FOUND',
        message: problem?.detail ?? 'The requested resource was not found.',
        status: 404,
      };
      return notFound;
    }
    case 409: {
      const conflict: ConflictError = {
        kind: 'CONFLICT',
        message,
        status: 409,
      };
      return conflict;
    }
    case 422: {
      const biz: BusinessRuleError = {
        kind: 'BUSINESS_RULE',
        message,
        status: 422,
      };
      return biz;
    }
    default: {
      const server: ServerError = {
        kind: 'SERVER',
        message: err.status >= 500 ? 'An unexpected server error occurred. Please try again.' : message,
        status: err.status,
      };
      return server;
    }
  }
}

/**
 * Safely extracts a ProblemDetail from the ApiResponse envelope in the error body.
 *
 * Returns null when the body is missing, not JSON, or does not follow the
 * expected ApiResponse<ProblemDetail> shape.
 */
function extractProblemDetail(err: HttpErrorResponse): ProblemDetail | null {
  try {
    const body = err.error as ApiResponse<ProblemDetail>;
    if (body && typeof body === 'object' && 'data' in body) {
      return body.data ?? null;
    }
    // Some endpoints may return ProblemDetail directly (non-wrapped)
    if (body && typeof body === 'object' && 'status' in body && 'detail' in body) {
      return body as unknown as ProblemDetail;
    }
    return null;
  } catch {
    return null;
  }
}
