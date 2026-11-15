# Authentication and RBAC

Authentication uses JWT (JSON Web Tokens). The backend issues a token on login; the
frontend stores it, attaches it to every API request, and reads the user's roles and
permissions directly from the token payload -- without a separate API call on each
page.

---

## How JWT authentication works

1. The user submits email and password on the login page.
2. The backend verifies the credentials and returns a `{ token }` object.
3. The frontend stores the token in `localStorage`.
4. For every subsequent request to `/api/v1`, the frontend adds the header
   `Authorization: Bearer <token>`.
5. The backend validates the token on every request and reads the user's identity
   and roles from it.
6. The token lasts 1 hour. There is no refresh endpoint. When it expires, the user
   must log in again.

The token payload (the middle part of the JWT, base64url-encoded) contains the
user's email (`sub`), roles, permissions, `iat`, `exp` and `jti`. `jwt.ts` decodes
this payload without verifying the signature -- signature verification is the
backend's responsibility.

---

## Token storage (`jwt.ts` and `auth.ts`)

`jwt.ts` is a pure utility: it decodes the base64url payload and returns the typed
claims. `auth.ts` reads and writes the token from `localStorage` and exposes the
decoded claims as signals.

```typescript
// Conceptually, auth.ts does this:
getToken()     -> string | null    // reads localStorage
setToken(t)                        // writes localStorage
clearTokens()                      // removes from localStorage (called on logout)
decodeJwt(t)   -> JwtClaims       // delegates to jwt.ts
isTokenValid() -> boolean          // checks exp > now
```

> **Why localStorage?** `sessionStorage` would log the user out on every tab close.
> An `HttpOnly` cookie would be more secure against XSS but requires CORS headers on
> the backend. For a tutorial that runs locally, localStorage keeps the
> implementation visible and simple.

---

## Session signals (`auth.ts`)

`auth.ts` is the single source of truth for the session. It exposes signals that
guards, directives and components consume:

```typescript
isAuthenticated  // true when a valid, non-expired token is present
currentUser      // { id, first_name, last_name, email, enabled, account_locked }
isAdmin          // true when the user has the ADMIN role
roles            // string[] -- role names from the token claims
permissions      // string[] -- RESOURCE:ACTION strings from the token claims
```

**Why signals?** Angular signals are synchronous and reactive. A component or guard
that reads `auth.isAuthenticated()` in a template automatically re-renders when the
value changes (after login or logout) without an `AsyncPipe` or manual subscription
management.

---

## Session restore at startup

When the user reloads the page, Angular starts from scratch. Without special
handling, the app would briefly show the login page before the guard had a chance
to check the stored token.

`app.config.ts` registers an app initializer:

```typescript
provideAppInitializer(() => {
  const auth = inject(Auth);
  return () => auth.restoreSession();
})
```

Angular runs every app initializer and waits for all of them to finish before it
processes any route. `restoreSession()` reads the token from `localStorage`, checks
its expiry, decodes the claims, and calls `GET /api/v1/auth/me` to load the current
user object. By the time the router evaluates `authGuard`, the signals already
reflect the real session state.

---

## The auth interceptor

`auth-interceptor.ts` adds `Authorization: Bearer <token>` to requests whose URL
starts with `environment.apiUrl` (`/api/v1`), and only when a valid token exists.

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  if (!auth.isTokenValid()) return next(req);
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${auth.getToken()}` },
  }));
};
```

The guard against the base URL prevents the token from leaking to third-party
requests if the app ever calls an external API.

---

## Route guards

Three guards protect routes that require authentication or a specific role or
permission.

### authGuard

Redirects to `/login` (with a `returnUrl` query parameter) if
`auth.isAuthenticated()` returns false. Applied to the parent route that wraps all
protected pages in `app.routes.ts`.

### roleGuard

Reads `data: { roles: ['ADMIN'] }` from the route. If the user holds none of the
required roles, it redirects to `/not-allowed`. Applied to the parent route
that wraps `/users`, `/roles` and `/permissions`.

### permissionGuard

Same pattern as `roleGuard`, but checks `data: { permissions: ['PRODUCT:READ'] }`.
Used for fine-grained access control on individual routes.

```typescript
// app.routes.ts (simplified)
{
  path: '',
  canActivate: [authGuard],      // must be signed in
  children: [
    { path: 'categories', loadChildren: () => ... },
    {
      path: '',
      canActivate: [roleGuard],  // must also be ADMIN
      data: { roles: ['ADMIN'] },
      children: [
        { path: 'users',       loadChildren: () => ... },
        { path: 'roles',       loadChildren: () => ... },
        { path: 'permissions', loadComponent: () => ... },
      ],
    },
  ],
},
```

---

## Template visibility directives

For UI elements that should appear only to admins (New, Delete, Edit buttons), use
the `appHasRole` and `appHasPermission` structural directives:

```html
<!-- Show only to users with the ADMIN role -->
<button *appHasRole="'ADMIN'" mat-flat-button (click)="openCreate()">
  New category
</button>

<!-- Show only to users with a specific permission -->
<button *appHasPermission="'PRODUCT:DELETE'" mat-icon-button (click)="delete(row)">
  <mat-icon>delete</mat-icon>
</button>
```

These directives read the session signals and add or remove the element from the DOM.
They do not make API calls. Because the signals are computed from JWT claims, they
update immediately when the user logs in or out.

---

## Password reset flow

1. User clicks "Forgot password" and submits their email.
2. The backend sends a reset email (always shows the same neutral confirmation
   message in the UI, regardless of whether the email exists, to prevent user
   enumeration).
3. The user clicks the link in the email, which carries a reset token.
4. The frontend reads the token from the URL query string and shows a
   "new password" form.
5. On submit, `POST /api/v1/auth/reset-password` consumes the token and sets the
   new password.
6. On success, the user is redirected to `/login`.
