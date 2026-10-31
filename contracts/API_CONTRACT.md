# API Contract

> **Source**: Generated from `contracts/business.openapi.json` (downloaded from
> `http://localhost:8080/v3/api-docs` on 2026-10-31).
> SST (spring-security-tutorial) has been decommissioned. SBT (spring-boot-tutorial)
> now owns all endpoints. Run `/contract-sync` once SBT is running to refresh the spec.

---

## Single backend

| Item | Value |
|---|---|
| Base URL (env) | `environment.apiUrl` = `/api/v1` |
| Auth header | `Authorization: Bearer <token>` |
| JWT lifetime | 1 hour, no refresh |
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
| GET | `/api/v1/auth/activate?token=` | -- | Public | Activates account; returns `UserResponse`; 400 on invalid/expired token |
| POST | `/api/v1/auth/login` | `LoginRequest` | Public | Returns `AuthResponse`; 401 for wrong credentials, locked or disabled account |
| POST | `/api/v1/auth/logout` | -- | Authenticated | Blacklists JWT server-side via `Authorization` header; call even if token is locally discarded |
| GET | `/api/v1/auth/me` | -- | Authenticated | Returns `UserResponse` |
| POST | `/api/v1/auth/forgot-password` | `ForgotPasswordRequest` | Public | Sends reset email; always 200 |
| POST | `/api/v1/auth/reset-password` | `ResetPasswordRequest` | Public | Consumes token, sets new password; 400 on invalid/expired token |

**Models:**

```ts
interface RegisterRequest       { username: string; email: string; password: string }
interface LoginRequest          { email: string; password: string }
interface AuthResponse          { token: string; token_type: string; username: string }
interface ForgotPasswordRequest { email: string }
interface ResetPasswordRequest  { token: string; new_password: string }
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
| PUT | `/api/v1/users/{id}/roles` | `AssignRolesRequest` | Replaces the full role set; returns `UserResponse` |

**Models:**

```ts
interface UserResponse        { id: number; username: string; email: string;
                                enabled: boolean; account_locked: boolean; roles: RoleResponse[] }
interface UpdateProfileRequest { username?: string; email?: string }
interface AssignRolesRequest   { role_ids: number[] }
```

---

## Roles endpoints (`/api/v1/roles`) -- ADMIN required

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/v1/roles` | -- | **Paginated** (`PageResponse<RoleResponse>`); pass `size=1000` to load all |
| POST | `/api/v1/roles` | `RoleRequest` | |
| PUT | `/api/v1/roles/{id}` | `RoleRequest` | |
| DELETE | `/api/v1/roles/{id}` | -- | 422 if still assigned to users |
| POST | `/api/v1/roles/{roleId}/permissions/{permissionId}` | -- | Returns updated `RoleResponse` |
| DELETE | `/api/v1/roles/{roleId}/permissions/{permissionId}` | -- | Returns updated `RoleResponse` |

**Models:**

```ts
interface PermissionResponse { id: number; resource: string; action: string }
interface PermissionRequest  { resource: string; action: string }
interface RoleResponse       { id: number; role_name: string; permissions: PermissionResponse[] }
interface RoleRequest        { role_name: string }
```

---

## Permissions endpoints (`/api/v1/permissions`) -- ADMIN required

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/v1/permissions` | -- | **Paginated** (`PageResponse<PermissionResponse>`); pass `size=1000` to load all |
| POST | `/api/v1/permissions` | `PermissionRequest` | |
| DELETE | `/api/v1/permissions/{id}` | -- | 422 if still assigned to a role |

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
| GET | `/api/v1/customers` | Authenticated | Paginated; optional `search` by name |
| GET | `/api/v1/customers/{id}` | Authenticated | Detail with `products` the customer ordered |
| GET | `/api/v1/customers/{id}/orders` | Authenticated | Paginated orders; 404 if customer not found |
| POST | `/api/v1/customers` | ADMIN | Body `CustomerRequest`; 201; email must be unique |
| PUT | `/api/v1/customers/{id}` | ADMIN | Body `CustomerRequest` |
| DELETE | `/api/v1/customers/{id}` | ADMIN | |

**Models:**

```ts
interface CustomerRequest  { first_name: string; last_name: string; telephone: string; email: string; address: string }
interface CustomerResponse { id: number; first_name: string; last_name: string; telephone: string;
                             email: string; address: string; products: ProductResponse[] }
```

---

## Orders (`/api/v1/orders`)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/v1/orders` | Authenticated | Paginated; filters: `customerId`, `productId` |
| GET | `/api/v1/orders/{id}` | Authenticated | Detail with full `customer` and `product` embedded |
| POST | `/api/v1/orders` | ADMIN | Body `OrderRequest`; 201; `total` computed by server |
| PUT | `/api/v1/orders/{id}` | ADMIN | Body `OrderRequest` |
| DELETE | `/api/v1/orders/{id}` | ADMIN | |

**Models:**

```ts
interface OrderRequest  { customer_id: number; product_id: number; quantity: number }
interface OrderResponse { id: number; customer: CustomerResponse; product: ProductResponse; quantity: number; total: number }
```

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
| `token` (reset password) | Required |
| `role_name` | Required (not blank) |
| `resource`, `action` | Required (not blank) |
| `category_name`, `product_name`, `address` | Required (not blank) |
| `unit_price` | Required, greater than 0 |
| `category_id`, `customer_id`, `product_id` | Required |
| `telephone` | Required, matches `^\+?[0-9()\-\s]{7,20}$` |
| `quantity` | Required, integer, greater than 0 |
| `first_name`, `last_name` (customer) | Required (not blank) |
