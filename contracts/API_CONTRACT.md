# API Contract

> **Source**: Generated from `contracts/business.openapi.json` (downloaded from
> `http://localhost:8080/v3/api-docs` on 2026-11-13, backend branch `feature/user-management`).
> SST (spring-security-tutorial) has been decommissioned. SBT (spring-boot-tutorial)
> now owns all endpoints. Run `/contract-sync` once SBT is running to refresh the spec.

---

## Single backend

| Item | Value |
|---|---|
| Base URL (env) | `environment.apiUrl` = `/api/v1` |
| Auth header | `Authorization: Bearer <token>` |
| JWT lifetime | configurable; `expires_in` seconds returned in `AuthResponse` |
| Refresh token | opaque string in `AuthResponse.refresh_token`; sent as `Authorization: Bearer <refresh>` to `POST /api/v1/auth/refresh-token` |
| Response envelope | `ApiResponse<T>` |
| Paginated lists | `data` is `PageResponse<T>` |
| Errors | `success: false`, `message`, `data` is `ProblemDetail` |
| Validation errors | `ProblemDetail` + `fieldErrors: Record<string, string>` |
| JSON naming | snake_case (`unit_price`, `role_name`, `account_locked`) |
| Pagination params | `page` (0-based), `size`, `sort` (e.g. `productName,asc`) |

### Shared TypeScript models

```ts
interface ApiResponse<T>  { success: boolean; message: string; data: T; timestamp: string }
interface PageResponse<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
interface ProblemDetail   { type?: string; title: string; status: number; detail: string; instance: string;
                            fieldErrors?: Record<string, string> }
```

### Error codes

| HTTP | AppError.kind | UI behaviour |
|---|---|---|
| 400 | `VALIDATION` | Map fieldErrors onto form controls; show message inline; dialog stays open |
| 401 | `UNAUTHENTICATED` | Clear session, redirect to `/login` with returnUrl. **Exception**: 401 from `POST /api/v1/auth/login` -> show message on the login form |
| 403 | `FORBIDDEN` | Show snackbar |
| 404 | `NOT_FOUND` | Not-found state on detail pages; "item no longer exists" in edit dialogs |
| 409 | `CONFLICT` | Show message, offer to reload (product modified elsewhere) |
| 422 | `BUSINESS_RULE` | Show backend message inline; keep dialog/row as-is |
| 5xx | `SERVER` | Generic message + retry |
| 0 | `NETWORK` | "Unable to connect" + retry |

### JWT claims

```ts
interface JwtClaims {
  sub:         string;    // username (not email)
  roles:       string[];  // uppercase role names, e.g. ['ADMIN']
  permissions: string[];  // RESOURCE:ACTION strings, e.g. ['PRODUCT:READ']
  exp:         number;    // Unix timestamp (seconds)
  jti:         string;    // token ID (server-side blacklist key)
}
```

---

## Auth endpoints (`/api/v1/auth`)

| Method | Path | Body | Access | Notes |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | `RegisterRequest` | Public | Creates disabled account; sends activation email; returns `UserResponse`; 422 if username/email taken |
| GET | `/api/v1/auth/activate-account?token=` | -- | Public | Activates account; returns `UserResponse`; 400 on invalid/expired token |
| POST | `/api/v1/auth/login` | `LoginRequest` | Public | Returns `AuthResponse`; 401 for wrong credentials, locked or disabled account |
| POST | `/api/v1/auth/logout` | -- | Authenticated | Blacklists JWT server-side via `Authorization` header; call even if token is locally discarded |
| POST | `/api/v1/auth/refresh-token` | -- | Authenticated (refresh) | Pass refresh token as `Authorization: Bearer <refresh>`; returns new `AuthResponse` |
| GET | `/api/v1/auth/me` | -- | Authenticated | Returns `UserResponse` |
| POST | `/api/v1/auth/forgot-password` | `ForgotPasswordRequest` | Public | Sends reset email; always 200 |
| POST | `/api/v1/auth/reset-password?token=` | `ResetPasswordRequest` | Public | Token is a **query param**; body has `new_password` + `confirm_password`; 400 on invalid/expired token |

**Models:**

```ts
interface RegisterRequest       { first_name: string; last_name: string; username: string; email: string; password: string; confirm_password: string }
interface LoginRequest          { email: string; password: string }
interface AuthResponse          { access_token: string; token_type: string; refresh_token: string; expires_in: number }
interface ForgotPasswordRequest { email: string }
interface ResetPasswordRequest  { new_password: string; confirm_password: string }
```

---

## Users endpoints (`/api/v1/users`) -- ADMIN required

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/v1/users` | -- | Paginated; params: `page`, `size`, `sort` |
| GET | `/api/v1/users/{id}` | -- | Detail with roles and permissions |
| PUT | `/api/v1/users/{id}` | `UpdateProfileRequest` | Updates username and/or email; 422 if already in use |
| DELETE | `/api/v1/users/{id}` | -- | |
| PATCH | `/api/v1/users/{id}/lock` | -- | Returns `UserResponse`; 422 if locking own account |
| PATCH | `/api/v1/users/{id}/unlock` | -- | Returns `UserResponse` |
| PATCH | `/api/v1/users/{id}/roles` | `UpdateUserRolesRequest` | Adds and removes roles in one call; returns the updated `UserResponse`; see "Partial updates with add / remove" |

**Models:**

```ts
interface UserResponse        { id: number; first_name: string; last_name: string; username: string; email: string;
                                enabled: boolean; account_locked: boolean; roles: RoleResponse[] }
interface UpdateProfileRequest { username?: string; email?: string }
interface UpdateUserRolesRequest { add?: number[]; remove?: number[] }  // role ids
```

---

## Roles endpoints (`/api/v1/roles`) -- ADMIN required

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/v1/roles` | -- | **Paginated** (`PageResponse<RoleResponse>`); pass `size=1000` to load all |
| POST | `/api/v1/roles` | `RoleRequest` | |
| PUT | `/api/v1/roles/{id}` | `RoleRequest` | |
| DELETE | `/api/v1/roles/{id}` | -- | 422 if still assigned to users |
| PATCH | `/api/v1/roles/{roleId}/permissions` | `UpdateRolePermissionsRequest` | Adds and removes permissions in one call; returns the updated `RoleResponse`; see "Partial updates with add / remove" |

**Models:**

```ts
interface PermissionResponse { id: number; resource: string; action: string }
interface PermissionRequest  { resource: string; action: string }
interface RoleResponse       { id: number; role_name: string; permissions: PermissionResponse[] }
interface RoleRequest        { role_name: string }
interface UpdateRolePermissionsRequest { add?: number[]; remove?: number[] }  // permission ids
```

---

## Permissions endpoints (`/api/v1/permissions`) -- ADMIN required

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/v1/permissions` | -- | **Paginated** (`PageResponse<PermissionResponse>`); pass `size=1000` to load all |
| POST | `/api/v1/permissions` | `PermissionRequest` | |
| DELETE | `/api/v1/permissions/{id}` | -- | 422 if still assigned to a role |

---

## Partial updates with add / remove

Applies to `PATCH /api/v1/users/{id}/roles` and `PATCH /api/v1/roles/{roleId}/permissions`.
The OpenAPI spec only describes the shape of the body; the rules below come from the backend
team and are not visible in `business.openapi.json`.

| Rule | Result |
|---|---|
| Body is `{ "add": [...], "remove": [...] }`; both fields are optional | -- |
| Both lists empty or missing | 400 |
| The same id present in `add` and in `remove` | 400 |
| Adding an id that is already assigned, or removing one that is not | No error, no effect (the former 422 "already assigned" / "not assigned" no longer exist) |
| Unknown id (user, role or permission) | 404, and nothing is modified (unknown role on a user used to be a 422) |

The UI sends only the differences: `add` holds the newly checked ids, `remove` the unchecked ones.

---

## Categories (`/api/v1/categories`)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/v1/categories` | Public | Paginated; `products` is empty in the list |
| GET | `/api/v1/categories/{id}` | Public | Detail with `products` filled |
| POST | `/api/v1/categories` | ADMIN | Body `CategoryRequest`; 201 |
| PUT | `/api/v1/categories/{id}` | ADMIN | Body `CategoryRequest` |
| DELETE | `/api/v1/categories/{id}` | ADMIN | 422 if category still has products |

**Models:**

```ts
interface CategoryRequest  { category_name: string }
interface CategoryResponse { id: number; category_name: string; created_at: string; updated_at: string;
                             products: ProductResponse[] }
```

---

## Products (`/api/v1/products`)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/v1/products` | Public | Paginated; filters: `categoryId`, `productName`, `minPrice`, `maxPrice`; `sort` |
| GET | `/api/v1/products/{id}` | Public | Detail |
| POST | `/api/v1/products` | ADMIN | Body `ProductRequest`; 201; 404 if category not found |
| PUT | `/api/v1/products/{id}` | ADMIN | Body `ProductRequest`; 409 on concurrent modification |
| DELETE | `/api/v1/products/{id}` | ADMIN | |

**Models:**

```ts
interface ProductRequest  { category_id: number; product_name: string; unit_price: number }
interface ProductResponse { id: number; product_name: string; unit_price: number;
                            category_id: number; category_name: string }
```

---

## Customers (`/api/v1/customers`)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/v1/customers` | Authenticated | Paginated; optional `search` by name; each customer carries its `products` and `total` |
| GET | `/api/v1/customers/{id}` | Authenticated | Detail; same shape as a list item (`products` and `total` filled) |
| GET | `/api/v1/customers/{id}/orders` | Authenticated | Paginated `OrderResponse` (one entry per order); 404 if customer not found |
| POST | `/api/v1/customers` | ADMIN | Body `CustomerRequest`; 201; email must be unique |
| PUT | `/api/v1/customers/{id}` | ADMIN | Body `CustomerRequest` |
| DELETE | `/api/v1/customers/{id}` | ADMIN | |

**Models:**

```ts
interface CustomerRequest  { first_name: string; last_name: string; telephone: string; email: string; address: string }
interface CustomerResponse { id: number; first_name: string; last_name: string; telephone: string;
                             email: string; address: string; products: OrderedProductResponse[]; total: number }
interface OrderedProductResponse { order_id: number; product_id: number; product_name: string;
                                   unit_price: number; quantity: number; total: number }
```

`products` holds **one line per order, not per product**: a product ordered twice gives two
lines, each with its own `order_id`, `quantity` and line `total`. `CustomerResponse.total` is the
customer's overall total. A customer without any order has an empty `products` list and a
`total` of 0. (Behaviour stated by the backend team; the OpenAPI spec only gives the shapes.)

`OrderedProductResponse` is also used by the grouped order list below.

---

## Orders (`/api/v1/orders`)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/v1/orders` | Authenticated | Paginated `CustomerOrdersResponse`: **orders grouped by customer**; filters: `customerId`, `productId`; see notes below |
| GET | `/api/v1/orders/{id}` | Authenticated | Single `OrderResponse` with `customer` and `product` embedded |
| POST | `/api/v1/orders` | ADMIN | Body `OrderRequest`; 201; returns a single `OrderResponse`; `total` computed by server |
| PUT | `/api/v1/orders/{id}` | ADMIN | Body `OrderRequest`; returns a single `OrderResponse` |
| DELETE | `/api/v1/orders/{id}` | ADMIN | |

**Models:**

```ts
interface OrderRequest  { customer_id: number; product_id: number; quantity: number }
interface OrderResponse { id: number; customer: OrderCustomerResponse; product: ProductResponse; quantity: number; total: number }
interface OrderCustomerResponse  { id: number; first_name: string; last_name: string; telephone: string;
                                   email: string; address: string }  // no products, no total
interface CustomerOrdersResponse { customer: OrderCustomerResponse; products: OrderedProductResponse[]; total: number }
```

Notes on `GET /api/v1/orders` (stated by the backend team; not visible in the OpenAPI spec):

- One entry per **customer having at least one order**, with that customer's order lines in
  `products` and their sum in `total`.
- Pagination counts **customers**, not orders: `totalElements` is the number of customers with
  at least one order.
- `sort` applies to customer fields only (`id`, `lastName`, `firstName`). Sorting by `total` or
  `quantity` is no longer possible on this endpoint.
- The single-order endpoints (`GET /orders/{id}`, `POST`, `PUT`, `GET /customers/{id}/orders`)
  still return one `OrderResponse` per order.

---

## Business rules the UI must enforce

| Rule | Where |
|---|---|
| Registration creates a disabled account; cannot log in until activated | Login form: show backend message from 401 |
| A locked account cannot log in | Login form: show backend message from 401 |
| The 401 on login is the same for wrong email and wrong password (no user enumeration) | Show backend message as-is; no redirect |
| `logout` must call the backend even if the response fails, then clear the session | `AuthService.logout()` |
| An admin cannot lock their own account | Disable the lock button on the current user's own row; backend also returns 422 |
| Deleting a role/permission still assigned returns 422 | Show backend message; keep the row |
| Role permissions and user roles are saved as a diff (`add` / `remove`) in one PATCH | Dialog with checkboxes; Save disabled while nothing changed (an empty diff is a 400) |
| Deleting a category with products returns 422 | Show backend message; keep the row |
| `total` of an order is computed by the server | Show a preview in the dialog; display the server's `total` once the order is saved |
| A product PUT can return 409 (modified elsewhere) | Show message, keep dialog open, offer to reload |
| Passwords and tokens are never logged, displayed or stored beyond the JWT | All auth flows |

---

## Validation rules (mirror as UX validation in forms)

| Field | Rule |
|---|---|
| `email` | Required, valid email format |
| `username` | Required, 3-50 characters |
| `password`, `new_password` | Required, at least 8 characters |
| `confirm_password` | Required, must match `password` / `new_password` |
| `role_name` | Required (not blank) |
| `resource`, `action` | Required (not blank) |
| `category_name`, `product_name`, `address` | Required (not blank) |
| `unit_price` | Required, greater than 0 |
| `category_id`, `customer_id`, `product_id` | Required |
| `telephone` | Required, matches `^\+?[0-9()\-\s]{7,20}$` |
| `quantity` | Required, integer, greater than 0 |
| `first_name`, `last_name` (user, customer) | Required (not blank) |
