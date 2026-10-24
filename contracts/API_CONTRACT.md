# API Contract

> **Source**: Derived from `README.md` (backends were not running at setup time).
> Run `/contract-sync` once the backends are up to replace the OpenAPI JSON stubs with live specs.
> This Markdown file is the authoritative reference for `feature/core-architecture`.

---

## Common conventions (both APIs)

| Item | Value |
|---|---|
| Auth header | `Authorization: Bearer <token>` |
| JWT lifetime | 1 hour, no refresh |
| Response envelope | `ApiResponse<T>` |
| Paginated lists | `data` is `PageResponse<T>` |
| Plain lists | `data` is `T[]` (roles, permissions) |
| Errors | `success: false`, `message`, `data` is `ProblemDetail` |
| Validation errors | `ProblemDetail` + `fieldErrors: Record<string, string>` |
| JSON naming | Mostly snake_case (`first_name`, `unit_price`) but not everywhere |
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
| 401 | `UNAUTHENTICATED` | Clear session, redirect to `/login` with returnUrl. **Exception**: 401 from `POST /api/auth/login` -> show message on the login form |
| 403 | `FORBIDDEN` | Show snackbar |
| 404 | `NOT_FOUND` | Not-found state on detail pages; "item no longer exists" in edit dialogs |
| 409 | `CONFLICT` | Show message, offer to reload (product modified elsewhere) |
| 422 | `BUSINESS_RULE` | Show backend message inline; keep dialog/row as-is |
| 5xx | `SERVER` | Generic message + retry |
| 0 | `NETWORK` | "Unable to connect" + retry |

### JWT claims

```ts
interface JwtClaims {
  sub:         string;    // user email
  roles:       string[];  // uppercase role names, e.g. ['ADMIN']
  permissions: string[];  // RESOURCE:ACTION strings, e.g. ['PRODUCT:READ']
  exp:         number;    // Unix timestamp (seconds)
  jti:         string;    // token ID (server-side blacklist key)
}
```

---

## Identity and RBAC API (`environment.identityApiUrl` = `/api`)

### Authentication endpoints

| Method | Path | Body | Access | Notes |
|---|---|---|---|---|
| POST | `/api/auth/register` | `RegisterRequest` | Public | Creates **disabled** account; sends activation email; returns `UserResponse` |
| GET | `/api/auth/activate-account?token=` | — | Public | Activates account; 400 on invalid/expired token |
| POST | `/api/auth/login` | `LoginRequest` | Public | Returns `AuthResponse`; 401 for wrong credentials, locked or disabled account |
| POST | `/api/auth/logout` | — | Authenticated | Blacklists JWT server-side; call it even if you then discard the token locally |
| GET | `/api/auth/me` | — | Authenticated | Returns `UserResponse` with **empty** `roles` list |
| POST | `/api/auth/forgot-password` | `ForgotPasswordRequest` | Public | Sends reset email; always 200 |
| POST | `/api/auth/reset-password` | `ResetPasswordRequest` | Public | Consumes token, sets new password; 400 on invalid/expired token |

**Models:**

```ts
interface RegisterRequest       { first_name: string; last_name: string; email: string; password: string }
interface LoginRequest          { email: string; password: string }
interface AuthResponse          { token: string }
interface ForgotPasswordRequest { email: string }
interface ResetPasswordRequest  { token: string; new_password: string }
```

### Users endpoints

| Method | Path | Body | Access | Notes |
|---|---|---|---|---|
| GET | `/api/users` | — | ADMIN | Paginated; `roles` empty in the list |
| GET | `/api/users/{id}` | — | ADMIN or owner | Detail with `roles` and `permissions` |
| PUT | `/api/users/{id}` | `UpdateProfileRequest` | ADMIN or owner | Updates first/last name only |
| DELETE | `/api/users/{id}` | — | ADMIN | |
| PATCH | `/api/users/{id}/lock` | — | ADMIN | 422 if locking own account |
| PATCH | `/api/users/{id}/unlock` | — | ADMIN | |
| POST | `/api/users/{userId}/roles/{roleId}` | — | ADMIN | Returns `UserResponse` with roles |
| DELETE | `/api/users/{userId}/roles/{roleId}` | — | ADMIN | Returns `UserResponse` with roles |

**Models:**

```ts
interface UserResponse       { id: number; first_name: string; last_name: string; email: string;
                               enabled: boolean; account_locked: boolean; roles: RoleResponse[] }
interface UpdateProfileRequest { first_name: string; last_name: string }
```

### Roles and permissions endpoints (all ADMIN)

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/roles` | — | Plain array; each role with its permissions |
| POST | `/api/roles` | `RoleRequest` | 201 |
| PUT | `/api/roles/{id}` | `RoleRequest` | |
| DELETE | `/api/roles/{id}` | — | 422 if still assigned to users |
| POST | `/api/roles/{roleId}/permissions/{permissionId}` | — | Returns updated `RoleResponse` |
| DELETE | `/api/roles/{roleId}/permissions/{permissionId}` | — | Returns updated `RoleResponse` |
| GET | `/api/permissions` | — | Plain array |
| POST | `/api/permissions` | `PermissionRequest` | 201 |
| DELETE | `/api/permissions/{id}` | — | 422 if still assigned to a role |

**Models:**

```ts
interface PermissionResponse { id: number; resource: string; action: string }
interface PermissionRequest  { resource: string; action: string }
interface RoleResponse       { id: number; role_name: string; permissions: PermissionResponse[] }
interface RoleRequest        { role_name: string }
```

---

## Business API (`environment.apiUrl` = `/api/v1`)

### Categories

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

### Products

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

### Customers

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

### Orders

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
| `password`, `new_password` | Required, at least 8 characters |
| `first_name`, `last_name` | Required (not blank) |
| `token` (reset password) | Required |
| `role_name` | Required (not blank) |
| `resource`, `action` | Required (not blank) |
| `category_name`, `product_name`, `address` | Required (not blank) |
| `unit_price` | Required, greater than 0 |
| `category_id`, `customer_id`, `product_id` | Required |
| `telephone` | Required, matches `^\+?[0-9()\-\s]{7,20}$` |
| `quantity` | Required, integer, greater than 0 |
