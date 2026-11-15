# Branch: feature/auth

This branch implements the full authentication flow: registration with email
activation, login, logout, password reset, session management, route guards,
the RBAC directives, and the user profile page.

---

## Learning objectives

After studying this branch you will understand:

- How to decode a JWT payload without a library
- How session signals are built from JWT claims
- How `provideAppInitializer` restores a session before the first route
- How route guards use signals to make access decisions synchronously
- How structural directives can read signals to conditionally render DOM elements
- How to handle the activation and password-reset email flows

---

## Public auth screens

| Route | Purpose |
|---|---|
| `/login` | Email + password; stores token and loads `/auth/me` on success |
| `/register` | Name + email + password; shows "check your email" on success |
| `/activate-account?token=` | Reads token from URL, calls the backend, shows result |
| `/forgot-password` | Email only; always shows neutral confirmation |
| `/reset-password?token=` | New password form; reads token from URL |

---

## Activation flow walkthrough

The activation flow is the step most likely to confuse a student on first run.

1. Register at `/register`. The backend sends an activation email.
2. Open your mail server (e.g. MailHog at `http://localhost:8025`).
3. Click the activation link. It points to
   `/activate-account?token=<UUID from the backend>`.
4. The page reads the `token` query parameter and calls
   `GET /api/v1/auth/activate-account?token=<UUID>`.
5. On success: show a success message with a link to `/login`.
6. On error (token expired, already used): show the backend error message on the
   page (not a redirect).

---

## Session signals cascade after login

When login succeeds, `auth.ts` calls `setToken(token)` and then
`loadCurrentUser()`. Here is the cascade of signals that fires:

```
setToken()
  -> token signal updated
  -> claims computed signal recomputes (decodes JWT payload)
  -> roles computed signal recomputes (from claims)
  -> permissions computed signal recomputes (from claims)
  -> isAuthenticated computed signal recomputes (token valid)
  -> isAdmin computed signal recomputes (roles includes ADMIN)

loadCurrentUser()  (GET /auth/me)
  -> currentUser signal updated (id, name, email, enabled, locked)
```

Guards and directives that read any of these computed signals automatically
re-evaluate when the token changes. No manual subscription management is needed.

---

## Toolbar: authenticated vs public state

`shell.ts` reads `auth.isAuthenticated()` to decide what to show in the toolbar:

```html
@if (auth.isAuthenticated()) {
  <!-- User menu: profile, logout -->
} @else {
  <!-- Login and register links -->
}
```

The "Administration" group in the sidenav reads `auth.isAdmin()` and is only added
to the DOM for admin users.

---

## Profile page

`/profile` loads the current user from `GET /auth/me` and displays:
- Name, email, account status (enabled, locked)
- The user's roles and permissions (read from the JWT claims, not from `/auth/me`,
  because `/auth/me` returns an empty roles list)
- An "Edit" button that opens the `UpdateProfileDialog` for name changes

The dialog calls `PUT /api/v1/users/{id}` and, on success, updates the
`currentUser` signal with the returned entity.

---

## 401 on login: special case

A 401 from `POST /auth/login` means wrong credentials or a locked/disabled account.
The standard `UNAUTHENTICATED` handling (clear session, redirect to `/login`) would
create a redirect loop on the login page itself. The auth service detects this
case by checking the request URL and returns the error directly to the login page
component, which shows the backend message inline on the form.

---

## Key files

| File | Purpose |
|---|---|
| `core/auth/auth.ts` | Session signals, token storage, all auth HTTP calls |
| `core/auth/jwt.ts` | JWT payload decoding (pure function, no library) |
| `core/auth/auth-guard.ts` | Requires a valid session |
| `core/auth/role-guard.ts` | Requires a role from route data |
| `core/auth/permission-guard.ts` | Requires a permission from route data |
| `core/auth/has-permission.ts` | Structural directive for template visibility |
| `features/auth/pages/login/login.page.ts` | Login form with inline 401 handling |
| `features/auth/pages/register/register.page.ts` | Registration form |
| `features/auth/pages/activate-account/activate-account.page.ts` | Token activation |
| `features/auth/pages/profile/profile.page.ts` | Current user profile |
