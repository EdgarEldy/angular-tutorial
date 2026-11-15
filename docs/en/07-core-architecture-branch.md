# Branch: feature/core-architecture

This branch sets up everything that all subsequent feature branches depend on:
the HTTP layer, the interceptors, the error handling infrastructure, the layout
shell, and the shared UI primitives.

---

## Learning objectives

After studying this branch you will understand:

- How to register functional interceptors with `provideHttpClient(withInterceptors)`
- How `errorInterceptor` converts `HttpErrorResponse` into `AppError`
- How to restore a session at startup with `provideAppInitializer`
- How the layout shell (sidenav + toolbar) is structured
- How to build a shared pagination helper for Material's `MatPaginator`
- How to containerise an Angular app with a multi-stage Dockerfile

---

## HTTP layer

The two interceptors are registered in `app.config.ts`:

```typescript
provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
```

`authInterceptor` runs first (adds the token), then `errorInterceptor` (converts
errors). This order matters: the auth interceptor must run before the response is
observed by the error interceptor.

The error mapper (`error-mapper.ts`) is a pure function. It converts an
`HttpErrorResponse` into an `AppError` by reading the HTTP status and, when
present, the `ApiResponse<ProblemDetail>` body. Pure functions are easier to test:
the error mapper unit tests cover every status code with no `TestBed` needed.

---

## Shared models

Three interfaces in `shared/models/` are used by every service:

| Interface | File | Purpose |
|---|---|---|
| `ApiResponse<T>` | `api-response.model.ts` | Wraps every backend response |
| `PageResponse<T>` | `page-response.model.ts` | Paginated list body |
| `ProblemDetail` | `problem-detail.model.ts` | RFC 7807 error detail |

---

## Layout shell

`core/layout/shell/shell.ts` renders the application frame: a Material toolbar at
the top and a sidenav on the left with navigation links. The main content area is a
`<router-outlet>`.

The sidenav shows the "Administration" section only to admins:

```html
@if (auth.isAdmin()) {
  <mat-nav-list>
    <a mat-list-item routerLink="/users">Users</a>
    <a mat-list-item routerLink="/roles">Roles</a>
    <a mat-list-item routerLink="/permissions">Permissions</a>
  </mat-nav-list>
}
```

This uses the `auth.isAdmin()` signal from `Auth`. The sidenav updates
automatically when the user logs in or out.

---

## Shared UI components

| Component | Purpose |
|---|---|
| `app-loading` | Spinner shown while data is loading |
| `app-error-banner` | Error state with a retry button |
| `app-empty-state` | Empty list or empty detail placeholder |
| `app-page-header` | Consistent page title + action button row |
| `app-confirm-dialog` | Generic delete / destructive action confirmation |

Every list page uses these three components for the loading, error and empty states.

---

## Pagination helper

`shared/pagination/` exports a function that converts `MatPaginator` and `MatSort`
events into `HttpParams`:

```typescript
// Converts pageIndex, pageSize and sort to page, size, sort=field,direction
buildPaginationParams(paginator: MatPaginator, sort?: MatSort): HttpParams
```

Every list page imports this helper so pagination is never implemented twice.

---

## MoneyPipe

`shared/pipes/money.pipe.ts` formats a number as a locale-aware currency string.
It uses the Angular `CurrencyPipe` internally and applies the project's default
currency code. Use it in every template that displays `unit_price` or `total`:

```html
{{ product.unit_price | money }}
```

---

## Docker and CI

The `Dockerfile` uses a two-stage build:
1. Node 22 Alpine installs dependencies and runs `npm run build`.
2. nginx 1.27 Alpine serves the compiled `dist/` folder.

`nginx.conf` proxies `/api/v1` to `host.docker.internal:8080` so the container can
reach the backend running on the host.

`.github/workflows/ci.yml` runs lint, test and build on every push to `develop` and
`master`. The build must pass before a PR can be merged.

---

## Key files

| File | Purpose |
|---|---|
| `app.config.ts` | Global providers including interceptors and app initializer |
| `app.routes.ts` | Top-level lazy routes |
| `core/http/error-mapper.ts` | Status -> AppError conversion |
| `core/http/error-interceptor.ts` | Applies error-mapper to every response |
| `core/auth/auth-interceptor.ts` | Adds Bearer token to API requests |
| `core/layout/shell/shell.ts` | Toolbar + sidenav layout |
| `shared/pagination/` | Material paginator -> HttpParams adapter |
| `shared/pipes/money.pipe.ts` | Currency formatter |
| `Dockerfile` | Multi-stage production image |
| `.github/workflows/ci.yml` | Lint + test + build CI pipeline |
