# angular-tutorial

A complete tutorial for building an **Angular 21** frontend that consumes two REST APIs with Angular's `HttpClient`:

- the **identity and RBAC API** from [`spring-security-tutorial`](https://github.com/EdgarEldy/spring-security-tutorial): registration, account activation, login, password reset, users, roles and permissions;
- the **business API** from [`spring-boot-tutorial`](https://github.com/EdgarEldy/spring-boot-tutorial): categories, products, customers and orders.

Both are Spring Boot 3.5 / Spring Security 6 APIs secured with JWT. This document is the **complete specification** of the project. It is written to be followed step by step, branch by branch. Read it fully before writing any code.

## Table of contents

- [Backend contract](#backend-contract)
- [Tech stack](#tech-stack)
- [Branching strategy](#branching-strategy)
- [Project structure](#project-structure)
- [Working with the REST APIs](#working-with-the-rest-apis)
- [Authentication and RBAC](#authentication-and-rbac)
- [Error handling](#error-handling)
- [Testing strategy](#testing-strategy)
- [feature/core-architecture](#featurecore-architecture)
- [feature/auth](#featureauth)
- [feature/rbac](#featurerbac)
- [feature/categories](#featurecategories)
- [feature/products](#featureproducts)
- [feature/customers](#featurecustomers)
- [feature/orders](#featureorders)
- [Order of work](#order-of-work)
- [Generate with the Angular CLI](#generate-with-the-angular-cli)
- [Code conventions](#code-conventions)
- [Concepts covered](#concepts-covered)
- [How to follow this tutorial](#how-to-follow-this-tutorial)

## Backend contract

| Item                 | Identity and RBAC API                                       | Business API                                               |
|----------------------|-------------------------------------------------------------|------------------------------------------------------------|
| Project              | `spring-security-tutorial`                                  | `spring-boot-tutorial`                                     |
| Path prefixes        | `/api/auth`, `/api/users`, `/api/roles`, `/api/permissions` | `/api/v1/categories`, `/products`, `/customers`, `/orders` |
| Documentation        | Swagger UI at `/swagger-ui.html`, OpenAPI at `/v3/api-docs` | Swagger UI at `/swagger-ui.html`, OpenAPI at `/v3/api-docs` |
| Authentication       | `POST /api/auth/login` returns the JWT                      | Same JWT, sent as `Authorization: Bearer <token>`          |

The Angular app uses **one session**: the token returned by `POST /api/auth/login` is sent to both APIs. The business API's own `/api/v1/auth/*` endpoints are **not used** by this app: registration, login and the current user all come from the identity API.

Common to both APIs:

| Item              | Value                                                                                                      |
|-------------------|------------------------------------------------------------------------------------------------------------|
| JWT               | `Authorization: Bearer <token>`; lifetime 1 hour; stateless; no refresh endpoint                           |
| Response envelope | Every response is an `ApiResponse<T>`: `{ success, message, data, timestamp }`                             |
| Lists             | `data` is a `PageResponse<T>`: `{ content, page, size, totalElements, totalPages }`; `page` is **0-based** (roles and permissions lists are plain, non-paginated arrays) |
| Errors            | `success: false`, a `message`, and in `data` an RFC 7807 `ProblemDetail`; validation errors add `fieldErrors` |
| JSON naming       | Mostly **snake_case** (`first_name`, `role_name`, `unit_price`), but not everywhere (see the models)       |
| Pagination params | `page` (0-based), `size`, `sort` (for example `sort=productName,asc`)                                      |

### Identity and RBAC endpoints

**Authentication** (`/api/auth`)

| Method | Path                           | Body                     | Access        | Notes                                                              |
|--------|--------------------------------|--------------------------|---------------|--------------------------------------------------------------------|
| POST   | `/auth/register`               | `RegisterRequest`        | Public        | Creates a **disabled** account and sends an activation email; returns `UserResponse` |
| GET    | `/auth/activate-account?token=`| none                     | Public        | Enables the account                                                |
| POST   | `/auth/login`                  | `LoginRequest`           | Public        | Returns `AuthResponse` (the JWT); `401` for wrong credentials, a locked account or a disabled account |
| POST   | `/auth/logout`                 | none                     | Authenticated | Adds the current JWT to the server-side blacklist                  |
| GET    | `/auth/me`                     | none                     | Authenticated | Current user (`roles` is an empty list here, see the RBAC section) |
| POST   | `/auth/forgot-password`        | `ForgotPasswordRequest`  | Public        | Sends a password-reset email                                       |
| POST   | `/auth/reset-password`         | `ResetPasswordRequest`   | Public        | Consumes the token and sets the new password                       |

**Users** (`/api/users`)

| Method | Path                           | Body                   | Access            | Notes                                                                     |
|--------|--------------------------------|------------------------|-------------------|---------------------------------------------------------------------------|
| GET    | `/users`                       | none                   | ADMIN             | Paginated; `roles` is empty in the list                                   |
| GET    | `/users/{id}`                  | none                   | ADMIN or owner    | Detail, **with `roles` and their `permissions`**                          |
| PUT    | `/users/{id}`                  | `UpdateProfileRequest` | ADMIN or owner    | Updates first and last name only                                          |
| DELETE | `/users/{id}`                  | none                   | ADMIN             |                                                                           |
| PATCH  | `/users/{id}/lock`             | none                   | ADMIN             | Sets `account_locked` to true; an admin cannot lock their own account (`422`) |
| PATCH  | `/users/{id}/unlock`           | none                   | ADMIN             |                                                                           |
| POST   | `/users/{userId}/roles/{roleId}`   | none               | ADMIN             | Assigns a role; returns the `UserResponse` with its roles                 |
| DELETE | `/users/{userId}/roles/{roleId}`   | none               | ADMIN             | Removes a role; returns the `UserResponse` with its roles                 |

"Owner" means the authenticated user whose id equals `{id}`; anyone else gets `403`.

**Roles and permissions** (all **ADMIN** only)

| Method | Path                                           | Body                | Notes                                                              |
|--------|------------------------------------------------|---------------------|--------------------------------------------------------------------|
| GET    | `/roles`                                       | none                | Plain list, each role with its `permissions`                       |
| POST   | `/roles`                                       | `RoleRequest`       | `201`                                                              |
| PUT    | `/roles/{id}`                                  | `RoleRequest`       |                                                                    |
| DELETE | `/roles/{id}`                                  | none                | Refused (`422`) while the role is still assigned to users          |
| POST   | `/roles/{roleId}/permissions/{permissionId}`   | none                | Returns the updated `RoleResponse`                                 |
| DELETE | `/roles/{roleId}/permissions/{permissionId}`   | none                | Returns the updated `RoleResponse`                                 |
| GET    | `/permissions`                                 | none                | Plain list                                                         |
| POST   | `/permissions`                                 | `PermissionRequest` | `201`                                                              |
| DELETE | `/permissions/{id}`                            | none                | Refused (`422`) while the permission is still assigned to a role   |

### Business endpoints

All paths are relative to `/api/v1`.

**Categories**

| Method | Path               | Notes                                                              | Access |
|--------|--------------------|--------------------------------------------------------------------|--------|
| GET    | `/categories`      | Paginated                                                          | Public |
| GET    | `/categories/{id}` | Detail, **with its `products`** (empty list in the paginated list) | Public |
| POST   | `/categories`      | Body `CategoryRequest`, `201`                                      | ADMIN  |
| PUT    | `/categories/{id}` | Body `CategoryRequest`                                             | ADMIN  |
| DELETE | `/categories/{id}` | `422` if the category still has products                           | ADMIN  |

**Products**

| Method | Path             | Notes                                                                                                     | Access |
|--------|------------------|-----------------------------------------------------------------------------------------------------------|--------|
| GET    | `/products`      | Paginated; optional filters `categoryId`, `productName` (contains, case-insensitive), `minPrice`, `maxPrice` | Public |
| GET    | `/products/{id}` | Detail                                                                                                    | Public |
| POST   | `/products`      | Body `ProductRequest`, `201`; `404` if the category does not exist                                        | ADMIN  |
| PUT    | `/products/{id}` | Body `ProductRequest`; `409` if the product was modified by another request since it was read             | ADMIN  |
| DELETE | `/products/{id}` |                                                                                                           | ADMIN  |

**Customers**

| Method | Path                      | Notes                                                                            | Access        |
|--------|---------------------------|----------------------------------------------------------------------------------|---------------|
| GET    | `/customers`              | Paginated; optional `search` (by name)                                           | Authenticated |
| GET    | `/customers/{id}`         | Detail, **with the `products` the customer ordered**                             | Authenticated |
| GET    | `/customers/{id}/orders`  | Paginated orders of one customer; `404` if the customer does not exist           | Authenticated |
| POST   | `/customers`              | Body `CustomerRequest`, `201`; the email must be unique                          | ADMIN         |
| PUT    | `/customers/{id}`         | Body `CustomerRequest`                                                           | ADMIN         |
| DELETE | `/customers/{id}`         |                                                                                  | ADMIN         |

**Orders**

| Method | Path           | Notes                                                                  | Access        |
|--------|----------------|------------------------------------------------------------------------|---------------|
| GET    | `/orders`      | Paginated; optional filters `customerId`, `productId`                  | Authenticated |
| GET    | `/orders/{id}` | Detail, with the full `customer` and `product` embedded                | Authenticated |
| POST   | `/orders`      | Body `OrderRequest`, `201`; `total` is computed by the server          | ADMIN         |
| PUT    | `/orders/{id}` | Body `OrderRequest`                                                    | ADMIN         |
| DELETE | `/orders/{id}` |                                                                        | ADMIN         |

### Models (JSON shapes)

The frontend models **mirror the JSON exactly**, including the snake_case names, so there is no mapping layer between the API and the UI. The naming is **not uniform**: some fields keep their Java name (`id`, `email`, `password`, `token`, `resource`, `action`, `telephone`, `address`, `quantity`, `total`).

```ts
// Envelope and errors (shared by both APIs)
interface ApiResponse<T> { success: boolean; message: string; data: T; timestamp: string }
interface PageResponse<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
interface ProblemDetail   { type?: string; title: string; status: number; detail: string; instance: string;
                            fieldErrors?: Record<string, string> }   // fieldErrors only on validation errors

// Identity: authentication
interface RegisterRequest       { first_name: string; last_name: string; email: string; password: string }   // password >= 8
interface LoginRequest          { email: string; password: string }
interface AuthResponse          { token: string }
interface ForgotPasswordRequest { email: string }
interface ResetPasswordRequest  { token: string; new_password: string }                                      // >= 8

// Identity: RBAC
interface PermissionResponse { id: number; resource: string; action: string }
interface PermissionRequest  { resource: string; action: string }
interface RoleResponse       { id: number; role_name: string; permissions: PermissionResponse[] }
interface RoleRequest        { role_name: string }
interface UserResponse       { id: number; first_name: string; last_name: string; email: string;
                               enabled: boolean; account_locked: boolean;
                               roles: RoleResponse[] }   // filled by GET /users/{id} and the assign/remove endpoints only
interface UpdateProfileRequest { first_name: string; last_name: string }

// Business: categories
interface CategoryRequest  { category_name: string }
interface CategoryResponse { id: number; category_name: string; created_at: string; updated_at: string;
                             products: ProductResponse[] }   // products filled on the detail endpoint only

// Business: products
interface ProductRequest  { category_id: number; product_name: string; unit_price: number }   // unit_price > 0
interface ProductResponse { id: number; product_name: string; unit_price: number;
                            category_id: number; category_name: string }

// Business: customers
interface CustomerRequest  { first_name: string; last_name: string; telephone: string; email: string; address: string }
interface CustomerResponse { id: number; first_name: string; last_name: string; telephone: string;
                             email: string; address: string; products: ProductResponse[] }   // products on the detail endpoint only

// Business: orders
interface OrderRequest  { customer_id: number; product_id: number; quantity: number }   // quantity >= 1
interface OrderResponse { id: number; customer: CustomerResponse; product: ProductResponse; quantity: number; total: number }
```

Validation rules enforced by the backends (mirror them as UX validation in the forms; the backends stay the authority):

| Field                                       | Rule                                                                  |
|---------------------------------------------|-----------------------------------------------------------------------|
| `email`                                     | required, valid email                                                 |
| `password`, `new_password`                  | required, at least 8 characters                                       |
| `first_name`, `last_name`                   | required (not blank)                                                  |
| `token` (reset password)                    | required                                                              |
| `role_name`                                 | required (not blank, trimmed by the backend)                          |
| `resource`, `action` (permission)           | required (not blank, trimmed by the backend)                          |
| `category_name`, `product_name`, `address`  | required (not blank)                                                  |
| `unit_price`                                | required, greater than 0                                              |
| `category_id`, `customer_id`, `product_id`  | required                                                              |
| `telephone`                                 | required, matches `^\+?[0-9()\-\s]{7,20}$`                            |
| `quantity`                                  | required, greater than 0                                              |

### Backend business rules the UI must respect

- Registration creates a **disabled** account; the user cannot log in until the account is activated with the token sent by email. A **locked** account cannot log in either.
- The `login` error is the same `401` for unknown email and wrong password (no user enumeration): show the backend message as it is.
- `logout` blacklists the JWT on the server: the app must call it, then discard the token locally even if the call fails.
- Deleting a **role still assigned to users**, or a **permission still assigned to roles**, is refused (`422`). An admin **cannot lock their own account** (`422`).
- Deleting a **category that still has products** is refused (`422`). The UI must show the backend message, not a generic one.
- `total` of an order is computed by the server (`quantity * unit_price`). The UI may show a preview but always displays the server's `total` once the order exists.
- Updating a product can fail with `409` when it was changed by someone else in the meantime: tell the user and offer to reload the product.
- Passwords and tokens are never displayed, logged or stored beyond the JWT.

## Tech stack

| Component            | Choice                                                                                          |
|----------------------|-------------------------------------------------------------------------------------------------|
| Framework            | **Angular 21**, standalone components, no NgModules, zoneless change detection (the default for new Angular 21 apps) |
| Language             | TypeScript (the version bundled with Angular 21), `strict` mode                                 |
| Scaffolding          | Angular CLI 21 is the default way to create files: `ng generate` for code, `ng add` for libraries (see [Generate with the Angular CLI](#generate-with-the-angular-cli)) |
| HTTP                 | Angular `HttpClient` with functional interceptors (`provideHttpClient(withInterceptors([...]))`) |
| State / reactivity   | Angular signals (`signal`, `computed`, `effect`, `linkedSignal`, `toSignal`, `toObservable`) for local and view state; RxJS only where `HttpClient` requires it |
| UI                   | Angular Material (create/update forms open in `MatDialog` dialogs)                              |
| Forms                | Typed Reactive Forms (`FormGroup<T>`, `FormControl<T>`), custom sync and async validators (Signal Forms are not used) |
| Routing              | Lazy-loaded standalone routes, functional guards, route data, router events for global loading  |
| Tests                | The unit-test runner that Angular 21 generates by default (Vitest, run with `ng test`), Angular `TestBed`, `provideHttpClientTesting` / `HttpTestingController` |
| Template syntax      | Built-in control flow (`@if`, `@for`, `@switch`), `@defer` for deferred rendering, `@let` for local template variables |
| Pipes                | Angular built-ins (`currency`, `date`, `titlecase`) plus one custom `MoneyPipe` in `shared/pipes` |
| App init             | `provideAppInitializer()` (Angular 19+) for session restore at startup                         |
| Lint / format        | `angular-eslint`, Prettier                                                                      |
| Containerization     | Docker (multi-stage build, nginx), docker-compose                                               |
| CI/CD                | GitHub Actions                                                                                  |

Create the project with Angular CLI **21** (`npx @angular/cli@21 new ...`) and confirm with `ng version`. Choose versions of `@angular/material` and the other libraries that declare compatibility with Angular 21; if a peer-dependency conflict appears, stop and report it instead of forcing the install. Use a Node.js version supported by Angular 21. Do not add libraries that are not listed here without asking (the JWT payload is decoded with a small hand-written helper, not a library).

## Branching strategy

| Branch                      | Role                                                                                          |
|-----------------------------|-----------------------------------------------------------------------------------------------|
| `master`                    | Stable code. No direct commits, only merges from `develop`.                                   |
| `develop`                   | Integration branch.                                                                           |
| `feature/core-architecture` | Project scaffold, HTTP layer (interceptors, error handling), layout shell, Docker, CI.        |
| `feature/auth`              | Registration, activation, login, logout, password reset, session, profile, RBAC primitives (guards, directive). |
| `feature/rbac`              | Administration of users, roles and permissions, and the assignments between them.             |
| `feature/categories`        | Category list, detail and CRUD.                                                               |
| `feature/products`          | Product list with filters, and CRUD.                                                          |
| `feature/customers`         | Customer list, detail, orders of a customer, and CRUD.                                        |
| `feature/orders`            | Order list, detail and CRUD.                                                                  |

Create `master`, then `develop` from it, then the first feature branch from `develop`.

## Project structure

```
angular-tutorial/
├── src/
│   ├── app/
│   │   ├── app.ts                       (root component; every component is a 4-file set generated by the CLI)
│   │   ├── app.config.ts                (provideRouter, provideHttpClient(withInterceptors), ...)
│   │   ├── app.routes.ts
│   │   ├── core/
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts      (session signals, register/login/logout/activate/reset, token storage)
│   │   │   │   ├── jwt.ts               (decodes the JWT payload: sub, roles, permissions, exp, jti)
│   │   │   │   ├── auth.guard.ts        (authenticated)
│   │   │   │   ├── role.guard.ts        (route data: required roles)
│   │   │   │   ├── permission.guard.ts  (route data: required permissions)
│   │   │   │   ├── has-permission.directive.ts   (structural: show/hide by permission or role)
│   │   │   │   └── auth.interceptor.ts  (adds the Bearer token to API requests)
│   │   │   ├── http/
│   │   │   │   ├── error.interceptor.ts (HttpErrorResponse -> AppError, session expiry handling)
│   │   │   │   ├── app-error.model.ts   (AppError)
│   │   │   │   └── error-mapper.ts      (status + ProblemDetail -> AppError)
│   │   │   ├── notification/
│   │   │   │   └── notification.service.ts   (snackbar wrapper)
│   │   │   └── layout/
│   │   │       ├── shell/               (toolbar, sidenav, router outlet)
│   │   │       └── not-found/
│   │   ├── shared/
│   │   │   ├── models/                  (api-response, page-response, problem-detail: generic API models)
│   │   │   ├── ui/                      (confirm-dialog, page-header, empty-state, loading, error-banner)
│   │   │   └── pagination/              (helper mapping Material's paginator to page/size/sort)
│   │   └── features/
│   │       ├── auth/                    (login, register, activate-account, forgot-password, reset-password, profile)
│   │       ├── users/                   (administration: list, detail, profile dialog, lock/unlock, role assignment)
│   │       ├── roles/                   (administration: roles, permission assignment)
│   │       ├── permissions/             (administration: list, create, delete)
│   │       ├── categories/
│   │       ├── products/
│   │       ├── customers/
│   │       └── orders/
│   ├── environments/                    (environment.ts, environment.development.ts: generated with `ng generate environments`)
│   └── styles.scss
├── proxy.conf.json                      (dev proxy: /api/v1 -> business API, /api -> identity API)
├── Dockerfile
├── nginx.conf
├── docker-compose.yml
├── .github/workflows/ci.yml
├── angular.json
├── package.json
└── README.md
```

Each `features/<name>/` folder contains: `<name>.routes.ts`, a `<name>.service.ts` service wrapping `HttpClient` for that resource, a `models/` folder (the request and response interfaces of the resource), and `pages/` (routed list and detail pages), `components/` (presentational components) and `dialogs/` (the create/update form dialogs). Every file that has an Angular CLI schematic (component, page, dialog, service, model, guard, interceptor, directive, pipe, ...) is generated with `ng generate` (see [Generate with the Angular CLI](#generate-with-the-angular-cli)).

## Working with the REST APIs

- **Two base URLs.** `environment.identityApiUrl` (`/api`) is used by the auth, users, roles and permissions services; `environment.apiUrl` (`/api/v1`) is used by the categories, products, customers and orders services. Never hard-code hosts.
- **Dev proxy.** `proxy.conf.json` forwards `/api/v1` to the business API and `/api` to the identity API. The `/api/v1` entry comes **first**, because `/api/v1/...` also matches `/api`. Each target is the address where you run the corresponding backend (for example `http://localhost:8080` and `http://localhost:8081`). The proxy also removes any dependence on CORS in development.
- **One service per resource** (`categories.service.ts`, `roles.service.ts`, ...) is the only code that injects `HttpClient` for that resource. Components never call `HttpClient` directly.
- **Unwrap the envelope in the service.** Services return the `data` of the `ApiResponse` (`map(res => res.data)`) as typed observables; components never see `ApiResponse`. Paginated lists return a `PageResponse<T>`; roles and permissions return plain arrays.
- **Typed everywhere**: every call is typed with the models above (`http.get<ApiResponse<PageResponse<ProductResponse>>>(...)`); never `any`.
- **Query parameters** are built with `HttpParams`, omitting empty values (no `categoryId=` or `search=`). Filters change -> reset to the first page.
- **Pagination**: Material's paginator is 0-based and so is the backend `page`: pass `pageIndex` and `pageSize` straight through as `page` and `size`, and sorting as `sort=<field>,<asc|desc>`. Use one shared helper for all lists.
- **Select options** (categories in the product dialog, customers and products in the order dialog, roles and permissions in the assignment dialogs) load the whole list (roles and permissions are plain lists) or the first page with a large `size`.
- **Money** (`unit_price`, `total`) is displayed with the `currency` pipe or one shared formatter; arithmetic on money is only allowed for a clearly labelled preview.
- **State in signals**: a page holds `items`, `loading`, `error`, `page`, `size`, `total` as signals; the service stays stateless.
- After a successful create, update, delete or assignment, **reload the current list** (or update the local signal from the returned entity) so the user sees the result; do not leave stale data on screen.

## Authentication and RBAC

### The access model

The identity API implements **role-based access control with permissions**:

- A user has **roles** (many-to-many); a role has **permissions** (many-to-many).
- A role is identified by `role_name` (for example `ADMIN`, `USER`).
- A permission is a pair `resource` + `action` (for example `PRODUCT` + `READ`), written `RESOURCE:ACTION` in uppercase when combined.
- The JWT carries the result in its claims: `sub` (the user's email), `jti`, `roles` (uppercase role names, for example `ADMIN`), `permissions` (de-duplicated `RESOURCE:ACTION` strings), `iat` and `exp`.

### Session

- `login` returns `{ token }`. Store the token (and nothing sensitive besides it) in `localStorage` under a single key.
- `jwt.ts` decodes the payload of the token (base64url -> JSON, no signature check: the backend is the authority) into `{ sub, roles, permissions, exp, jti }`. `AuthService` exposes signals derived from it: `token`, `claims`, `roles`, `permissions`, `isAuthenticated`, `isAdmin` (`roles` contains `ADMIN`), plus `currentUser`, loaded with `GET /auth/me` right after login (id, names, email, enabled, locked).
- **The roles and permissions used by the UI come from the JWT claims**, not from `/auth/me`: `/auth/me` returns the user with an empty `roles` list. A token whose `exp` has passed is treated as no session and is never sent.
- On application start, if a stored token is still valid, rebuild the session from it and call `/auth/me`; if the call fails, clear the session.
- The token lasts **1 hour** and there is no refresh endpoint. Role or permission changes made by an administrator reach the affected user's UI at their **next login**, because the claims are fixed at login. When the backend answers `401`, clear the session, keep the target URL, redirect to `/login`, and return to the target URL after a successful login.
- `logout` calls `POST /api/auth/logout` (so the token is blacklisted), then clears the token and the session signals even if the call failed, and navigates to `/login`.

### Sending the token

- `authInterceptor` (functional, generated with `ng generate interceptor`) adds `Authorization: Bearer <token>` to requests whose URL starts with `identityApiUrl` or `apiUrl`, and only when a valid token exists. It never adds the token to other hosts, and it does not touch the public endpoints' behavior (they work with or without it).

### RBAC primitives

All of them read the `AuthService` signals, so the UI reacts when the session changes:

| Primitive                 | Generated with                                  | Use                                                                                                        |
|---------------------------|-------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| `AuthService.hasRole(name)`, `hasAnyRole(...)` | `ng generate service`        | Role checks in code (case-insensitive, role names compared in uppercase).                                   |
| `AuthService.hasPermission('RESOURCE:ACTION')`, `hasAnyPermission(...)` | same | Permission checks in code, against the `permissions` claim.                                            |
| `authGuard`               | `ng generate guard --functional`                | Requires a valid session; otherwise redirects to `/login` with the return URL.                             |
| `roleGuard`               | `ng generate guard --functional`                | Reads `data: { roles: ['ADMIN'] }` from the route; denies access when the user holds none of them.         |
| `permissionGuard`         | `ng generate guard --functional`                | Reads `data: { permissions: ['PRODUCT:READ'] }` from the route; denies access when the user holds none.    |
| `*appHasPermission` / `*appHasRole` | `ng generate directive`               | Structural directive (signal-based inputs): renders its template only when the user holds the permission or role. |

When a guard denies a signed-in user, route to the "not allowed" state (not to `/login`).

### Authorization rules applied in the UI

Mirror the backend rules; hiding an element is UX only, the backend enforces them and its `403` must still be handled gracefully.

| Area                                           | Rule                                                                                       |
|------------------------------------------------|--------------------------------------------------------------------------------------------|
| Register, activate, login, forgot/reset password | Public                                                                                   |
| Categories and products (read)                 | Public: reachable without logging in                                                       |
| Customers and orders (read)                    | Authenticated: behind `authGuard`                                                          |
| Create, update, delete: categories, products, customers, orders | Role `ADMIN`: action buttons use `*appHasRole="'ADMIN'"`                  |
| Administration (users, roles, permissions)     | Role `ADMIN`: routes behind `roleGuard` with `data: { roles: ['ADMIN'] }`; the "Administration" menu is hidden for other users |
| Own profile (view, edit first and last name)   | Any authenticated user, on their own account only                                          |

Fine-grained permission checks (`RESOURCE:ACTION`) go through the primitives above whenever a screen or action must depend on a specific permission; the permission strings the user holds are shown on the profile page.

## Error handling

- `errorInterceptor` (functional, generated with `ng generate interceptor`) catches every `HttpErrorResponse` and converts it, through `error-mapper.ts`, into one `AppError { kind, status, message, fieldErrors? }`, where `kind` is one of: `VALIDATION`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE`, `SERVER`, `NETWORK`.
- Mapping from the HTTP status: `400` -> `VALIDATION` (field errors, or an invalid or expired activation/reset token), `401` -> `UNAUTHENTICATED`, `403` -> `FORBIDDEN`, `404` -> `NOT_FOUND`, `409` -> `CONFLICT`, `422` -> `BUSINESS_RULE`, `5xx` -> `SERVER`, status `0` -> `NETWORK`.
- The user-facing text comes from the error body when present (`message` of the `ApiResponse`, or `detail` of the `ProblemDetail`), falling back to a generic text only when the body is missing. The mapper tolerates a missing or differently shaped body (for example on `401` and `403`).
- Behavior per kind:
  - `VALIDATION`: map each `fieldErrors` entry onto the form control with the same name (accept both the Java spelling and the snake_case JSON spelling of the key) and show the remaining message inline in the dialog or form. For an invalid activation or reset token, show the message on the page.
  - `UNAUTHENTICATED`: clear the session, redirect to `/login`, keep the return URL. **Exception:** a `401` returned by `POST /api/auth/login` means wrong credentials, or a locked or disabled account: show the message on the login form instead of redirecting.
  - `FORBIDDEN`: show a notification; on navigation, route to the "not allowed" state.
  - `NOT_FOUND`: show a not-found state on detail pages; on a dialog edit, tell the user the item no longer exists and refresh the list.
  - `CONFLICT` (`409`, product modified elsewhere): show the message, keep the dialog open and offer to reload the product.
  - `BUSINESS_RULE` (`422`): show the backend message and keep the dialog or the row as is. Typical cases: a category that still has products, a role or permission still assigned, an admin locking their own account, a duplicate customer email.
  - `SERVER` / `NETWORK`: generic message with a retry action.
- Every list and detail screen has three explicit states: loading, error (with retry), and empty.

## Testing strategy

Every branch ships its tests before its pull request is opened.

| Layer             | Tool                                                       | What it verifies                                                                                        |
|-------------------|------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Services          | `TestBed` + `provideHttpClientTesting` / `HttpTestingController` | Each resource service sends the right method, URL, query parameters and body, unwraps `ApiResponse`, and propagates errors. |
| Interceptors      | `TestBed` + `HttpTestingController`                        | `authInterceptor` adds the token only to the two API base URLs and never sends an expired one; `errorInterceptor` maps each status to the right `AppError.kind`. |
| JWT and session   | Unit tests / `TestBed`                                     | `jwt.ts` decoding (roles, permissions, exp), token storage, session restore, logout clears state even when the call fails. |
| RBAC primitives   | `TestBed`                                                  | `hasRole` / `hasPermission`, `authGuard`, `roleGuard`, `permissionGuard`, and the directives show or hide their content. |
| Components        | `TestBed` + component harnesses (Material)                 | Loading / error / empty / data states, form validation, dialogs (open, submit, stay open on error, close on success), actions hidden for non-admins. |

Tests must not require the real backends to be running. Test files and test names follow the Angular CLI's existing conventions (`*.spec.ts` next to the code, `describe` / `it` blocks).

## feature/core-architecture

### Tasks

- [x] Create the project with Angular CLI **21** in the current repository root (standalone, SCSS, routing, no SSR, existing git repository kept): `npx @angular/cli@21 new angular-tutorial --directory . --style=scss --ssr=false --skip-git`. `ng new` generates its own `README.md` and would replace this one: keep a copy of this file and restore it right after the generation. Confirm with `ng version` that the project is on Angular 21, and keep strict TypeScript and strict templates enabled.
- [x] Install the UI and tooling with `ng add @angular/material` and `ng add angular-eslint`; add Prettier. `npm run lint` must pass.
- [x] Environments: run `ng generate environments`, then add `apiUrl` (`/api/v1`). A single backend serves all resources (auth, users, roles, permissions, categories, products, customers, orders).
- [x] `proxy.conf.json`: `/api/v1` forwarded to the backend; wire it in `angular.json` for `ng serve`.
- [x] Generic API models (`ApiResponse`, `PageResponse`, `ProblemDetail`) in `shared/models`, generated with `ng generate interface ... --type=model`.
- [x] `authInterceptor` and `errorInterceptor` (`ng generate interceptor`, functional), `error-mapper.ts` and `AppError`, registered in `app.config.ts` with `provideHttpClient(withInterceptors([...]))`, with unit tests for every status mapping
- [x] App shell: Material toolbar + sidenav + `router-outlet`, navigation entries for each domain (entries for not-yet-implemented features are added by their own branch), not-found page and a "not allowed" page, global loading/error primitives in `shared/ui`, shared `confirm-dialog`
- [x] `NotificationService` (snackbar) used by all features for success and error messages
- [x] Pagination helper shared by every list: maps Angular Material's `MatPaginator` (`pageIndex`, `pageSize`, `sort`) to the backend's `page`, `size`, `sort` parameters
- [x] `MoneyPipe` in `shared/pipes` (`ng generate pipe shared/pipes/money`): formats a number as a locale-aware currency string; used in every screen that displays `unit_price` or `total`
- [x] `Dockerfile` (multi-stage: Node build, then nginx serving `dist` and proxying `/api/v1` to the backend), `nginx.conf`, and a `docker-compose.yml` that runs the frontend and expects the backend reachable (either as a service built from the backend repository or via `host.docker.internal`; document the chosen option)
- [x] `.github/workflows/ci.yml`: install, lint, test, build on every push and pull request
- [x] Replace this README's "How to follow" commands if the real commands differ

## feature/auth

Depends on `feature/core-architecture`.

### Screens

| Route                          | Operation                               | Behavior                                                                                                   |
|--------------------------------|-----------------------------------------|------------------------------------------------------------------------------------------------------------|
| `/login`                       | `POST /auth/login`                      | Email + password; on success store the token, load `/auth/me`, go to the return URL or `/`. Links to register and forgot password. |
| `/register`                    | `POST /auth/register`                   | First name, last name, email, password (+ confirmation, client-side match check); on success show "check your email to activate your account". |
| `/activate-account?token=`     | `GET /auth/activate-account?token=`     | Reads the `token` query parameter, calls the endpoint, shows success (link to login) or the backend error. |
| `/forgot-password`             | `POST /auth/forgot-password`            | Email only. Always show the same neutral confirmation message, whatever the backend answers about the email. |
| `/reset-password?token=`       | `POST /auth/reset-password`             | New password + confirmation (client-side match check); token from the query string; on success go to `/login`. |
| `/profile` (authenticated)     | `GET /auth/me`, `PUT /users/{id}`       | Shows the account (name, email, status), the user's **roles and permissions** (from the token claims), and an edit dialog for first and last name on the user's own id. |

### Tasks

- [ ] `AuthService` (session signals, token storage, `register`, `login`, `logout`, `activateAccount`, `forgotPassword`, `resetPassword`, `loadCurrentUser`, `hasRole`, `hasPermission`), `jwt.ts`, the three guards (`authGuard`, `roleGuard`, `permissionGuard`) and the `appHasPermission` / `appHasRole` directives, with tests
- [ ] The six pages above, with typed reactive forms and field-level validation matching the backend rules (valid email, password at least 8 characters, required names)
- [ ] A `401` on login (wrong credentials, locked or disabled account) shows the backend message on the form, without a redirect loop
- [ ] On a `400` returned by `register` or `reset-password`, map `fieldErrors` onto the form fields and show an invalid-token message on the page
- [ ] Return-URL handling after a forced redirect to `/login`
- [ ] Toolbar: show the current user's name with a menu (profile, logout) when authenticated, login / register links otherwise; the "Administration" entry is shown to admins only
- [ ] Tests: login and register error mapping, JWT decoding and session restore, guards, directives, token added only to the API base URLs, logout clears the session when the call fails

## feature/rbac

Depends on `feature/auth`. Everything here is reserved to the `ADMIN` role: routes under `/admin` use `roleGuard` with `data: { roles: ['ADMIN'] }`.

### Screens

| Route               | Operations                                                                                       | Screens                                                                                                                              |
|---------------------|--------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `/admin/users`      | `GET /users`, `GET /users/{id}`, `PUT /users/{id}`, `PATCH /users/{id}/lock`, `PATCH /users/{id}/unlock`, `DELETE /users/{id}` | Paginated table (name, email, enabled, locked), edit dialog (first and last name), lock/unlock and delete with confirmation. |
| User roles          | `GET /users/{id}`, `GET /roles`, `POST` and `DELETE /users/{userId}/roles/{roleId}`              | A "Manage roles" dialog opened from the user row: the user's roles as removable chips (with their permissions on hover or in an expandable list) and an "add role" select listing the roles not yet assigned. |
| `/admin/roles`      | `GET /roles`, `POST /roles`, `PUT /roles/{id}`, `DELETE /roles/{id}`                             | Table of roles with their permissions, create/edit dialog (`role_name`), delete with confirmation.                                   |
| Role permissions    | `GET /permissions`, `POST` and `DELETE /roles/{roleId}/permissions/{permissionId}`               | A "Manage permissions" dialog opened from the role row: assigned permissions as removable chips and an "add permission" select.      |
| `/admin/permissions`| `GET /permissions`, `POST /permissions`, `DELETE /permissions/{id}`                              | Table (`resource`, `action`, and the combined `RESOURCE:ACTION`), create dialog, delete with confirmation.                           |

There is no "create user" screen: accounts are created through registration (an administrator manages them afterwards).

### Tasks

- [ ] The three features `users`, `roles` and `permissions` (service, models, routes, pages, dialogs); `roles` and `users` use the `roles` and `permissions` services for their assignment dialogs
- [ ] The user list does not show roles (the list endpoint returns none); the "Manage roles" dialog loads `GET /users/{id}` and updates its chips from the `UserResponse` returned by every assign or remove call
- [ ] The "Manage permissions" dialog updates its chips from the `RoleResponse` returned by every assign or remove call, and the roles table reflects the change on close
- [ ] An administrator cannot lock or delete **their own** account from the UI: disable those actions on the current user's row (the backend also refuses locking one's own account with a `422`)
- [ ] Deleting a role or permission that is still assigned returns a `422`: show the backend message and keep the row
- [ ] Role names and permission `resource` / `action` are free text in the dialogs; show a hint about the convention (`ADMIN`, `PRODUCT` + `READ` giving `PRODUCT:READ`)
- [ ] Tests: assignment dialogs update from the returned entity, own-account protection, `422` display, non-admin denied on every `/admin` route

## feature/categories

Depends on `feature/core-architecture`.

| Operation                           | Screen / action                                                                  |
|-------------------------------------|----------------------------------------------------------------------------------|
| `GET /categories`                   | Paginated table (public)                                                         |
| `GET /categories/{id}`              | Detail page listing the category and **its products** (public)                   |
| `POST /categories`                  | Create dialog (`category_name`), ADMIN only                                      |
| `PUT /categories/{id}`              | Edit dialog, pre-filled from the list row, ADMIN only                            |
| `DELETE /categories/{id}`           | Delete with confirmation, ADMIN only                                             |

### Tasks

- [ ] `CategoriesService`, models (`CategoryRequest`, `CategoryResponse`), routes, list page, detail page, create/edit dialog
- [ ] The list shows `category_name` and the dates; it does not rely on `products` (empty in the list)
- [ ] Deleting a category that still has products returns `422`: show the backend message and keep the row
- [ ] Expose the categories to the products feature (select and filter) through the categories service, rather than duplicating the call
- [ ] Tests: list states, dialog validation and error display, delete rejection path

## feature/products

Depends on `feature/categories`.

| Operation                  | Screen / action                                                                                          |
|----------------------------|----------------------------------------------------------------------------------------------------------|
| `GET /products`            | Paginated table with filters: category, name (contains), minimum and maximum price, and sorting (public) |
| `GET /products/{id}`       | Detail, if a detail view is needed                                                                       |
| `POST /products`           | Create dialog: `product_name`, `unit_price`, `category_id` (select), ADMIN only                          |
| `PUT /products/{id}`       | Edit dialog, ADMIN only                                                                                  |
| `DELETE /products/{id}`    | Delete with confirmation, ADMIN only                                                                     |

### Tasks

- [ ] `ProductsService`, models, routes, list page, create/edit dialog
- [ ] Filters: category select, name search (debounced, `productName`), min and max price; any change resets to the first page and re-queries; empty filters are not sent
- [ ] The table shows `category_name` straight from the product (no extra call per row)
- [ ] `unit_price` input: numeric, greater than 0 (UX validation), displayed with the currency formatter
- [ ] Handle `409` on update (product modified elsewhere) as described in error handling
- [ ] Tests: filter parameters, empty filters omitted, form validation, `409` handling

## feature/customers

Depends on `feature/core-architecture`.

| Operation                       | Screen / action                                                                             |
|---------------------------------|---------------------------------------------------------------------------------------------|
| `GET /customers`                | Paginated table with a name search (`search`), authenticated users                          |
| `GET /customers/{id}`           | Detail page: customer data and the products they ordered                                    |
| `GET /customers/{id}/orders`    | On the detail page: paginated orders of the customer                                        |
| `POST /customers`               | Create dialog: first name, last name, telephone, email, address, ADMIN only                 |
| `PUT /customers/{id}`           | Edit dialog, ADMIN only                                                                     |
| `DELETE /customers/{id}`        | Delete with confirmation, ADMIN only                                                        |

### Tasks

- [ ] `CustomersService`, models, routes (behind `authGuard`), list page, detail page, create/edit dialog
- [ ] Validation in the dialog matching the backend (required fields, valid email, telephone pattern)
- [ ] A duplicate email or any other `422` shows the backend message in the dialog
- [ ] Handle the backend rejecting a deletion (for example a customer with orders) by showing its message
- [ ] Tests

## feature/orders

Depends on `feature/products` and `feature/customers`.

| Operation                  | Screen / action                                                                  |
|----------------------------|----------------------------------------------------------------------------------|
| `GET /orders`              | Paginated table with customer and product filters, authenticated users            |
| `GET /orders/{id}`         | Detail page (customer and product embedded)                                       |
| `POST /orders`             | Create dialog: customer (select), product (select), quantity (integer >= 1), ADMIN only |
| `PUT /orders/{id}`         | Edit dialog, ADMIN only                                                           |
| `DELETE /orders/{id}`      | Delete with confirmation, ADMIN only                                              |

### Tasks

- [ ] `OrdersService`, models, routes (behind `authGuard`), list page, detail page, create/edit dialog
- [ ] The customer and product selects reuse the customers and products services (first page with a large `size`)
- [ ] The order dialog shows a **preview** of the total (`quantity * unit_price`) clearly labelled as an estimate; after saving, display the server's `total`
- [ ] The table shows `customer` and `product` names from the embedded objects, with no extra call per row
- [ ] Tests: filter parameters, preview vs server total, dialog error display

## Order of work

1. `feature/core-architecture` -> Pull Request to `develop`
2. `feature/auth` (depends on `core-architecture`) -> Pull Request to `develop`
3. `feature/rbac` (depends on `auth`) -> Pull Request to `develop`
4. `feature/categories` (depends on `core-architecture`) -> Pull Request to `develop`
5. `feature/products` (depends on `categories`) -> Pull Request to `develop`
6. `feature/customers` (depends on `core-architecture`) -> Pull Request to `develop`
7. `feature/orders` (depends on `products`, `customers`) -> Pull Request to `develop`
8. `develop` -> `master`

## Generate with the Angular CLI

Everything that has an Angular CLI schematic is created with `ng generate` (or `ng add` for libraries), never by creating the file by hand. This keeps file layout, naming, class suffixes, spec files and workspace registration consistent, and it means every generated unit starts with its `.spec.ts` file, which is kept and filled with real tests (see [Testing strategy](#testing-strategy)).

| To create                                   | Command (examples)                                                                  |
|---------------------------------------------|-------------------------------------------------------------------------------------|
| Page (routed component)                     | `ng generate component features/categories/pages/category-list --type=page` (gives `category-list.page.ts`, `.html`, `.scss`, `.spec.ts`) |
| Dialog (create/update form)                 | `ng generate component features/categories/dialogs/category-form --type=dialog` (gives `category-form.dialog.ts`, `.html`, `.scss`, `.spec.ts`) |
| Presentational component                    | `ng generate component features/categories/components/category-table` (four files: `.ts`, `.html`, `.scss`, `.spec.ts`) |
| Service (resource, session, notification, ...) | `ng generate service features/categories/categories` (default type, no `--type`); `ng generate service core/notification/notification` |
| Model (interface), enum, class              | `ng generate interface features/products/models/product-response --type=model` (gives `product-response.model.ts`); `ng generate enum ...`; `ng generate class ...` |
| Guard                                       | `ng generate guard core/auth/auth --functional`; `ng generate guard core/auth/role --functional`; `ng generate guard core/auth/permission --functional` |
| HTTP interceptor                            | `ng generate interceptor core/auth/auth --functional`                               |
| Directive, pipe                             | `ng generate directive core/auth/has-permission`; `ng generate pipe shared/pipes/...` |
| Environments                                | `ng generate environments`                                                          |
| Angular Material, ESLint                    | `ng add @angular/material`; `ng add angular-eslint`                                 |

Rules:

- Run the schematic from the repository root with the full path (`features/<name>/<folder>/<item>`), so the file lands in the right place and its spec file is generated next to it.
- **Keep the CLI's default type wherever one exists.** Schematics that already have a default type (service, guard, interceptor, pipe, directive, resolver) are run **without** `--type`. Pass `--type` only where the table shows it (`page`, `dialog`, `model`): those schematics have no default type, and it makes the role of the file explicit in its name. Never create these files by hand or rename them afterwards.
- **Keep the file and class names the CLI produces.** This README writes service names in the classic form (`categories.service.ts`, `CategoriesService`, `AuthService`, `NotificationService`); if the installed CLI 21 names a generated file differently, follow the CLI and adapt the references.
- Use the schematic options that match this tutorial: functional guards and interceptors, standalone components, SCSS.
- Files **without** a schematic are written by hand: `*.routes.ts`, `jwt.ts`, `error-mapper.ts` and other plain functions, `proxy.conf.json`, Docker and CI files.

## Code conventions

- Angular 21 idioms: standalone components only, zoneless-compatible code (state in signals, no reliance on Zone.js), `ChangeDetectionStrategy.OnPush` everywhere; use `inject()` rather than constructor injection; use the built-in control flow (`@if`, `@for`, `@switch`), `@defer` for deferred template blocks (list tables, heavy dialogs), `@let` for local template variable bindings, signal-based `input()`/`output()`/`model()` and `computed()`/`effect()`/`linkedSignal()` for view state; `toSignal()` to bridge RxJS observables into the signal world and `toObservable()` for the reverse.
- **Smart / dumb split**: page components fetch data and orchestrate; presentational components receive inputs and emit outputs.
- Components never call `HttpClient`: they call the resource service. Services never contain UI logic (no snackbars, no navigation).
- **Authorization checks go through the RBAC primitives** (`hasRole`, `hasPermission`, the guards and the directives); never compare role or permission strings ad hoc in templates or components.
- No `any`. No non-null assertions (`!`) to silence the compiler. Treat `strict` errors as real errors.
- Models mirror the API JSON, snake_case included; configure the lint rule on property naming so these models pass, and keep camelCase for everything that is not an API model.
- Reactive forms are typed (`FormGroup<...>`); validation messages are explicit and in one place per form.
- **Components are four files**: `.ts`, `.html`, `.scss`, `.spec.ts`, with templates and styles in their own files (`templateUrl`, `styleUrl`), never inline. Pages and dialogs are components too.
- **Create and update go through dialogs.** Every create/update form (category, product, customer, order, role, permission, user profile) and every assignment screen (user roles, role permissions) is a dialog component opened with Angular Material's `MatDialog` from the list page, never a separate routed form page. A dialog receives the entity to edit (or nothing, for a create) through `MAT_DIALOG_DATA`, pre-fills its typed form from it, and disables the submit button while the request is running. On success it closes with the saved entity and the list reloads; on a `400`, `409` or `422` it stays open and shows the backend message inline. Delete confirmations use the shared `confirm-dialog`. Routed pages are reserved for lists, details, the profile and the public authentication screens.
- Subscriptions and long-lived observables are always cleaned up: use `takeUntilDestroyed(inject(DestroyRef))` for imperative subscriptions, `toSignal()` to convert an observable to a signal (automatic cleanup), or the `async` pipe in templates. Never leave a live subscription after the component is destroyed.
- Feature folders are lazy loaded; each exposes a `*.routes.ts`.
- File names: kebab-case, named by the CLI: the default type for services, guards, interceptors and directives (`categories.service.ts`, `auth.guard.ts`, `auth.interceptor.ts`) and `--type` for pages, dialogs and models (`category-list.page.ts`, `category-form.dialog.ts`, `product-response.model.ts`).
- Never log tokens or passwords, never display them, never put the token in a URL.
- Commit messages are imperative and scoped (`rbac: add role permission assignment dialog`).

## Concepts covered

### HTTP and REST
- Consuming two REST APIs with `HttpClient`, shared `ApiResponse<T>` / `PageResponse<T>` envelopes
- Functional HTTP interceptors: `authInterceptor` (token injection) and `errorInterceptor` (centralised error mapping)
- `HttpParams` for typed, immutable query-string construction; omitting empty filters
- `provideHttpClient(withInterceptors([...]))` and `provideHttpClientTesting` / `HttpTestingController` in tests
- Dev proxy (`proxy.conf.json`) to avoid CORS in development; two targets keyed by path prefix

### Authentication and session
- JWT without a library: base64url decode, claims (`sub`, `roles`, `permissions`, `exp`), expiry check
- `localStorage` for token storage; session restore at startup with `provideAppInitializer()`
- `AuthService` as a single source of truth: signals for `token`, `claims`, `isAuthenticated`, `isAdmin`, `currentUser`
- Login, logout (server-side blacklist), registration with email activation, password reset flow

### Signals and reactivity
- `signal()` for mutable local state; `computed()` for derived read-only values
- `effect()` for reacting to signal changes (e.g., reload list when filters change)
- `linkedSignal()` (Angular 19+) for writable derived signals (e.g., reset page when filter changes)
- `toSignal()` to convert an `Observable` to a `Signal` with automatic cleanup
- `toObservable()` to drive RxJS pipelines from a signal value
- `input()`, `output()`, `model()` signal-based component API; no `@Input()` / `@Output()`

### Routing
- Lazy-loaded feature routes with `loadChildren`; `*.routes.ts` as the public API of each feature
- Functional guards: `authGuard`, `roleGuard` (route `data`), `permissionGuard`
- Return-URL pattern: preserve the target URL across a forced `/login` redirect
- Router events subscription for a global loading indicator in the shell

### Template syntax (Angular 21)
- Built-in control flow: `@if`, `@for` (with `track`), `@switch`
- `@defer` blocks for deferred rendering (list tables load after initial paint)
- `@let` for local template variable binding (avoid repeating computed expressions)
- Structural directives: `*appHasRole`, `*appHasPermission` (write your own)

### Forms
- Typed `FormGroup<T>` and `FormControl<T>`: no implicit `any` in form values
- `fb.nonNullable` group so `reset()` restores initial values, not `null`
- Custom sync validators (`Validators.pattern` for phone, password-match cross-field validator)
- Mapping backend `fieldErrors` (400) onto form controls with `setErrors({ server: '...' })`
- Disabling submit during in-flight requests with a `saving` signal

### RBAC UI primitives
- Reading roles and permissions from JWT claims (not from `/auth/me`)
- `*appHasRole` / `*appHasPermission` structural directives for conditional rendering
- `roleGuard` and `permissionGuard` with route `data`; "not allowed" page for denied signed-in users

### Error handling
- `ProblemDetail` (RFC 7807) and `ApiResponse` envelope; tolerant parsing when body is absent
- `AppError` taxonomy: `VALIDATION`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE`, `SERVER`, `NETWORK`
- Handling `409` (optimistic-lock conflict on product update) and `422` (domain rule violation)
- Three explicit page states: loading, error (with retry), empty/data

### Pagination and filtering
- Angular Material `MatPaginator` (0-based) wired directly to the backend `page` / `size` params
- Shared pagination helper: translates `MatPaginator` + `MatSort` events to `HttpParams`
- Filter signals: any change resets `page` to 0 and re-queries; empty values are never sent
- Debouncing a text filter with `rxjs/operators debounceTime`

### Components and architecture
- Smart / dumb split: page components orchestrate data; presentational components receive `input()` and emit `output()`
- `ChangeDetectionStrategy.OnPush` everywhere; signals drive change detection without Zone.js
- `inject()` for dependency injection inside class bodies and functional factories
- `DestroyRef` + `takeUntilDestroyed()` for imperative subscription cleanup
- `MatDialog` for create / update forms and assignment screens; `ConfirmDialog` for deletes
- Custom pipe (`MoneyPipe`) for locale-aware currency formatting

### Testing
- `TestBed` + `HttpTestingController` for service and interceptor tests
- Testing every `AppError.kind` mapping from HTTP status codes
- Material harnesses for component interaction tests
- Guards tested with `TestBed` and mocked `AuthService` signals

### Tooling and deployment
- Angular CLI: `ng generate`, `ng add`; CLI naming conventions in Angular 21
- `angular-eslint` + Prettier; ESLint override for snake_case API model properties
- Docker multi-stage build (Node + nginx), `docker-compose.yml`
- GitHub Actions CI: install, lint, test, build on every push and PR

## How to follow this tutorial

1. Start the relevant backend (see its README). Both backends use port **8080** by default and are never started simultaneously — start the one that matches the branch you are working on:
   ```bash
   # Identity and RBAC API (feature/auth, feature/rbac)
   cd spring-security-tutorial
   docker-compose up          # or: mvn spring-boot:run -Dspring-boot.run.profiles=dev

   # Business API (feature/categories, feature/products, feature/customers, feature/orders)
   cd spring-boot-tutorial
   docker-compose up          # or: mvn spring-boot:run -Dspring-boot.run.profiles=dev
   ```
   Open the Swagger UI at `http://localhost:8080/swagger-ui.html` to explore the endpoints.
2. Clone this repository and check out `develop`:
   ```bash
   git clone https://github.com/EdgarEldy/angular-tutorial.git
   cd angular-tutorial
   git checkout develop
   npm install
   ```
3. `proxy.conf.json` already points both `/api/v1` and `/api` to `http://localhost:8080`. No changes needed.
4. Follow the branches in order: `feature/core-architecture` -> `feature/auth` -> `feature/rbac` -> `feature/categories` -> `feature/products` -> `feature/customers` -> `feature/orders`.
5. Run the app against the active backend:
   ```bash
   npm start                   # ng serve with proxy.conf.json, http://localhost:4200
   ```
6. Quality gates before every pull request: `npm run lint`, `npm test`, `npm run build`.
