/**
 * Request body for POST /api/roles and PUT /api/roles/{id}.
 *
 * Role names are free text; the convention is UPPERCASE (e.g. 'ADMIN', 'USER').
 * The backend stores the name as-is and embeds it in JWT claims at login.
 */
export interface RoleRequest {
  /** Role name, by convention in UPPERCASE (e.g. 'ADMIN', 'MANAGER'). */
  role_name: string;
}
