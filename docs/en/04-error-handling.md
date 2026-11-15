# Error handling

Every HTTP error in the application is converted into one typed `AppError` by the
`errorInterceptor`. Components never see a raw `HttpErrorResponse`; they always
receive a structured error with a `kind` that tells them what happened and what UI
to show.

---

## The AppError type

```typescript
interface AppError {
  kind:        ErrorKind;
  status:      number;
  message:     string;
  fieldErrors?: Record<string, string>;
}

type ErrorKind =
  | 'VALIDATION'      // 400 -- invalid input or expired token
  | 'UNAUTHENTICATED' // 401 -- token missing, expired or blacklisted
  | 'FORBIDDEN'       // 403 -- authenticated but not authorised
  | 'NOT_FOUND'       // 404 -- resource does not exist
  | 'CONFLICT'        // 409 -- optimistic lock violation
  | 'BUSINESS_RULE'   // 422 -- domain rule violation
  | 'SERVER'          // 5xx -- unexpected server error
  | 'NETWORK';        // 0   -- cannot reach the server
```

---

## The error mapper (`error-mapper.ts`)

`error-mapper.ts` converts a raw HTTP status and body into an `AppError`. The
backend wraps errors in an `ApiResponse<ProblemDetail>`:

```typescript
// What the backend sends on error
interface ProblemDetail {
  title:       string;
  status:      number;
  detail:      string;
  instance:    string;
  fieldErrors?: Record<string, string>;  // only on 400
}
```

The mapper reads the `message` from `ApiResponse` (the human-readable summary)
and falls back to `ProblemDetail.detail` if the outer message is absent:

| HTTP status | ErrorKind |
|---|---|
| 400 | `VALIDATION` (fieldErrors populated when present) |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 422 | `BUSINESS_RULE` |
| 5xx | `SERVER` |
| 0 (no connection) | `NETWORK` |

The mapper is tolerant: it handles missing or differently shaped bodies (for
example, `401` and `403` from Spring Security often arrive with no JSON body at
all) and always produces a valid `AppError`.

---

## The error interceptor

`error-interceptor.ts` sits at the end of the interceptor chain. It catches every
`HttpErrorResponse` and converts it:

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => throwError(() => mapToAppError(err)))
  );
```

After this interceptor, only typed `AppError` objects propagate as errors. Services
do not need a `catchError` unless they want to add resource-specific logic.

---

## Behavior per kind

Each `ErrorKind` has a standard UI response. This consistency is important: a
student should always know what happens when a 403 arrives, regardless of which
screen is active.

| Kind | UI behavior |
|---|---|
| `VALIDATION` | Map `fieldErrors` onto form controls; show remaining message inline |
| `UNAUTHENTICATED` | Clear session, redirect to `/login` with `returnUrl` |
| `FORBIDDEN` | Show snackbar with the backend message |
| `NOT_FOUND` | Show error banner with retry on detail pages |
| `CONFLICT` | Show backend message inline in dialog, keep dialog open, offer reload |
| `BUSINESS_RULE` | Show backend message inline in dialog, keep dialog open |
| `SERVER` | Show error banner with retry |
| `NETWORK` | Show error banner with retry |

**Exception:** a `401` from `POST /api/v1/auth/login` means wrong credentials or a
locked account. The service detects this case (by checking the request URL before
the redirect) and shows the message inline on the login form instead of redirecting.

---

## The three-state pattern

Every list or detail page has three explicit states. Using Angular signals:

```typescript
loading = signal(false);
error   = signal<AppError | null>(null);
items   = signal<CategoryResponse[]>([]);
```

The template uses `@if` to show the right state:

```html
@if (loading()) {
  <app-loading />
} @else if (error()) {
  <app-error-banner [error]="error()!" (retry)="load()" />
} @else if (items().length === 0) {
  <app-empty-state message="No categories found." />
} @else {
  <!-- data table -->
}
```

This pattern eliminates the common mistake of showing a blank screen when a request
fails or returns no results. Every screen has an explicit state for every possible
outcome.

---

## Validation errors and form controls

When the backend returns `400` with `fieldErrors`, map each entry onto the form
control with the matching name:

```typescript
error: (err: AppError) => {
  if (err.kind === 'VALIDATION' && err.fieldErrors) {
    Object.entries(err.fieldErrors).forEach(([field, msg]) => {
      this.form.get(field)?.setErrors({ server: msg });
    });
  }
  this.formError.set(err.message);
}
```

The backend may use the Java property name (camelCase) or the JSON snake_case name
as the key. The `error-mapper.ts` normalises common variants, but the form controls
in this project use the same snake_case names as the JSON models, so the mapping
works directly.
