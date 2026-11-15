# Architecture overview

This document explains how the application is structured and why it is structured
that way. Read it before looking at any feature branch: the patterns here repeat
in every feature.

---

## Request flow

```
Browser
  |
  v
Component (page or dialog)
  |  calls a method on
  v
Feature service (e.g. CategoriesService)
  |  calls HttpClient
  v
authInterceptor      -- adds Authorization: Bearer <token>
  |
  v
errorInterceptor     -- converts HttpErrorResponse -> AppError
  |
  v
Backend (Spring Boot, /api/v1)
```

The two interceptors are registered globally in `app.config.ts` with
`provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`. Every HTTP
call in the application passes through both of them, in that order. Components never
see `HttpErrorResponse`; they only ever receive a typed result or an `AppError`.

---

## Folder structure

```
src/app/
  app.ts                     Root component (the shell is in core/layout/shell)
  app.config.ts              Global providers (router, HttpClient, interceptors, AppInitializer)
  app.routes.ts              Top-level routes (lazy-loads each feature)
  core/
    auth/
      auth.ts                Session signals, token storage, register/login/logout
      jwt.ts                 Decodes JWT payload (no signature check)
      auth-guard.ts          Requires a valid session
      role-guard.ts          Requires a specific role (from route data)
      permission-guard.ts    Requires a specific permission (from route data)
      has-permission.ts      Structural directive: show/hide by role or permission
      auth-interceptor.ts    Adds Bearer token to /api/v1 requests
    http/
      error-interceptor.ts   HttpErrorResponse -> AppError
      app-error.model.ts     AppError type
      error-mapper.ts        status + ProblemDetail -> AppError
    notification/
      notification.ts        MatSnackBar wrapper
    layout/
      shell/                 Toolbar, sidenav, router-outlet
  shared/
    models/                  ApiResponse, PageResponse, ProblemDetail
    ui/                      confirm-dialog, page-header, empty-state, loading, error-banner
    pagination/              Material paginator -> page/size/sort adapter
    pipes/
      money.pipe.ts          Formats unit_price and total as locale-aware currency
  features/
    auth/                    Login, register, activate, forgot-password, reset-password, profile
    users/                   User list, lock/unlock, role assignment (ADMIN)
    roles/                   Role list, permission assignment (ADMIN)
    permissions/             Permission list, create, delete (ADMIN)
    categories/              Category list, detail, CRUD
    products/                Product list with filters, CRUD
    customers/               Customer list, detail, orders, CRUD
    orders/                  Order list, detail, CRUD
```

---

## Key design decisions

### Smart / dumb component split

Page components (in `pages/`) fetch data, hold loading/error signals, and orchestrate
actions. Presentational components (in `components/`) receive typed `input()` signals
and emit `output()` events. This separation makes the presentational components
reusable and easy to test: you give them data, you observe what they emit.

### Services own the HTTP layer

Feature services (e.g. `categories.ts`, `products.ts`) are the only code that
injects `HttpClient`. They unwrap the `ApiResponse<T>` envelope and return the typed
`data` as an `Observable<T>`. Components call service methods; they never construct
URLs or parse responses.

### Session at startup with provideAppInitializer

`app.config.ts` registers an app initializer:

```typescript
provideAppInitializer(() => {
  const auth = inject(Auth);
  return () => auth.restoreSession();
})
```

Angular runs every app initializer and waits for it to complete before it evaluates
any route. `restoreSession()` reads the token from `localStorage`, validates its
expiry, decodes the claims, and loads the current user from the backend. By the time
any guard runs, the `isAuthenticated` signal already reflects the real state.

Without this, the app would briefly show the login page on every hard refresh, even
when a valid token is stored.

### Lazy loading

Each feature folder exposes a `*.routes.ts` file. `app.routes.ts` loads features with
`loadChildren(() => import('./features/xxx/xxx.routes'))`. The router downloads only
the bundle for the feature the user navigates to, keeping the initial load small.

### Two bases, one service per resource

All endpoints live under `/api/v1` (one backend). The service reads
`environment.apiUrl` for every call. If the backend is ever split, only the
environment file changes.

### Signals for local and view state

Each page holds its state as signals (`signal()`, `computed()`, `linkedSignal()`).
Components use `ChangeDetectionStrategy.OnPush`, so Angular re-renders only when a
signal value actually changes. No Zone.js, no manual change detection calls.
