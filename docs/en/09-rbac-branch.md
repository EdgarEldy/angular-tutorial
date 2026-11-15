# Branch: feature/rbac

This branch implements the administration screens for users, roles and permissions.
Everything here is restricted to the ADMIN role. The three routes (`/users`,
`/roles`, `/permissions`) are grouped under a pathless parent route that uses
`roleGuard` with `data: { roles: ['ADMIN'] }`.

---

## Learning objectives

After studying this branch you will understand:

- How to group routes under a shared guard using a pathless parent
- How to build a checkbox-based assignment dialog (roles to users, permissions to roles)
- How to compute a diff of two sets and send only the changed assignments
- How the ADMIN self-protection rule works in the UI
- How `422` (domain rule violation) surfaces as an inline error

---

## Screens

| Route | What it shows |
|---|---|
| `/users` | Paginated user table with lock/unlock and delete actions |
| `/roles` | List of roles with their permissions; create, edit, delete |
| `/permissions` | List of all permissions; create, delete |

---

## Manage Roles dialog (from the Users table)

1. The user row has a "Manage roles" icon button.
2. Clicking it opens a dialog that calls `GET /api/v1/users/{id}` to load the
   user's current roles (the list endpoint returns no roles).
3. All roles are shown as checkboxes. Those already assigned are pre-checked.
4. When the admin clicks Save, the dialog computes the diff between the initial
   set and the final set:
   - Roles to add: selected now but not originally assigned
   - Roles to remove: not selected now but originally assigned
5. It calls `POST /api/v1/users/{id}/roles/{roleId}` once per addition and
   `DELETE /api/v1/users/{id}/roles/{roleId}` once per removal.
6. On success: the dialog closes and the user row reloads its detail.

The diff approach avoids sending unchanged assignments to the backend and keeps
the number of HTTP calls to a minimum.

---

## Manage Permissions dialog (from the Roles table)

Same pattern as Manage Roles:

1. All permissions are loaded from `GET /api/v1/permissions`.
2. Those already on the role are pre-checked (from the roles list, which embeds
   permissions).
3. On Save: diff is computed, `POST` and `DELETE` to
   `/api/v1/roles/{roleId}/permissions/{permissionId}` for each changed entry.
4. The roles table reflects the change on close.

---

## ADMIN self-protection rule

An administrator cannot lock or delete their own account from the UI:

```html
<!-- Disable lock/delete on the current user's own row -->
<button
  mat-icon-button
  [disabled]="user.id === auth.currentUser()?.id"
  (click)="lockUser(user)">
  <mat-icon>lock</mat-icon>
</button>
```

The backend also enforces this (`422` on self-lock), but the UI should prevent the
action before the request is made to give a better user experience.

---

## 422 on delete

Deleting a role that is still assigned to users, or a permission still assigned to
roles, returns `422`. The UI shows the backend message inline and keeps the row:

```typescript
deleteRole(id: number): void {
  this.rolesService.deleteRole(id).subscribe({
    next: () => this.loadRoles(),
    error: (err: AppError) => {
      if (err.kind === 'BUSINESS_RULE') {
        this.notification.error(err.message);
      }
    },
  });
}
```

---

## Key files

| File | Purpose |
|---|---|
| `features/users/users.ts` | User list, lock/unlock, delete, Manage Roles dialog trigger |
| `features/roles/roles.ts` | Role list, Manage Permissions dialog trigger |
| `features/permissions/pages/permission-list/permission-list.page.ts` | Permission list |
| Each feature's `dialogs/` folder | Create/edit forms and assignment dialogs |
