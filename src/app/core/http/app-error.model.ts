/**
 * Discriminated union of every error kind the application can encounter.
 *
 * The errorInterceptor catches HttpErrorResponse and passes it to mapHttpError,
 * which returns an AppError. Components and services receive AppError via the
 * RxJS error channel and switch on the kind to decide what to show.
 *
 * Kind-to-action mapping:
 *
 * | Kind           | Status | Action                                        |
 * |----------------|--------|-----------------------------------------------|
 * | VALIDATION     | 400    | Show per-field errors in the form             |
 * | UNAUTHENTICATED| 401    | Redirect to /login, clear session             |
 * | FORBIDDEN      | 403    | Show not-allowed page or inline banner        |
 * | NOT_FOUND      | 404    | Show not-found page or inline banner          |
 * | CONFLICT       | 409    | Toast with message                            |
 * | BUSINESS_RULE  | 422    | Toast with message                            |
 * | SERVER         | 5xx    | Toast "Unexpected error, please try again"    |
 * | NETWORK        | 0      | Toast "Network error, check your connection"  |
 */
export type ErrorKind =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'SERVER'
  | 'NETWORK';

/** Base fields present on every AppError variant. */
interface AppErrorBase {
  kind: ErrorKind;
  message: string;
  status: number;
}

/** 400 – one or more form fields failed validation. */
export interface ValidationError extends AppErrorBase {
  kind: 'VALIDATION';
  /** Keys are field names (camelCase or snake_case); values are the first error message. */
  fieldErrors: Record<string, string>;
}

/** 401 – no valid session; the user must log in. */
export interface UnauthenticatedError extends AppErrorBase {
  kind: 'UNAUTHENTICATED';
}

/** 403 – authenticated but not authorized for this resource. */
export interface ForbiddenError extends AppErrorBase {
  kind: 'FORBIDDEN';
}

/** 404 – requested resource does not exist. */
export interface NotFoundError extends AppErrorBase {
  kind: 'NOT_FOUND';
}

/** 409 – unique-constraint violation (duplicate email, SKU, etc.). */
export interface ConflictError extends AppErrorBase {
  kind: 'CONFLICT';
}

/** 422 – request is syntactically valid but violates a business rule. */
export interface BusinessRuleError extends AppErrorBase {
  kind: 'BUSINESS_RULE';
}

/** 5xx – unexpected server-side failure. */
export interface ServerError extends AppErrorBase {
  kind: 'SERVER';
}

/** HTTP 0 / no network response – DNS failure, server unreachable, CORS abort. */
export interface NetworkError extends AppErrorBase {
  kind: 'NETWORK';
}

/** Union of all typed application errors. */
export type AppError =
  | ValidationError
  | UnauthenticatedError
  | ForbiddenError
  | NotFoundError
  | ConflictError
  | BusinessRuleError
  | ServerError
  | NetworkError;
