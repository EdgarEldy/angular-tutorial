/**
 * A permission granted to a role, identified by resource and action.
 *
 * The RESOURCE:ACTION convention used in JWT claims (e.g. 'PRODUCT:READ')
 * is derived from these two fields at token-generation time on the backend.
 */
export interface PermissionResponse {
  id: number;
  /** Resource the permission applies to (e.g. 'PRODUCT', 'ORDER'). */
  resource: string;
  /** Operation allowed on that resource (e.g. 'READ', 'WRITE', 'DELETE'). */
  action: string;
}

/**
 * A role assigned to a user, bundled with its permission set.
 *
 * Roles are embedded in the JWT at login time. This response model is used
 * when the full role object (including nested permissions) is needed, such
 * as on the profile page.
 */
export interface RoleResponse {
  id: number;
  /** Role name as stored in the backend (e.g. 'ADMIN', 'USER'). */
  role_name: string;
  /** All permissions granted by this role. */
  permissions: PermissionResponse[];
}

/**
 * Full user representation returned by GET /api/auth/me and PUT /api/users/{id}.
 *
 * Account status flags (enabled, account_locked) are read from this object on
 * the profile page. Role and permission lists for access decisions are read
 * from the JWT claims instead, since the token is always in sync with the
 * server at the time of login.
 */
export interface UserResponse {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  /** Whether the account has been activated via email confirmation. */
  enabled: boolean;
  /** Whether the account has been administratively locked. */
  account_locked: boolean;
  /** Roles assigned to this user, each with their permissions. */
  roles: RoleResponse[];
}
