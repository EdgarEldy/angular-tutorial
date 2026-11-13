/**
 * Request body for PATCH /api/v1/roles/{roleId}/permissions.
 *
 * The backend applies a diff instead of replacing the whole permission set:
 * the client only sends what changed. This keeps the request small and avoids
 * overwriting a change made by another administrator in the meantime.
 *
 * Rules enforced by the backend (not visible in the OpenAPI spec):
 * - both fields are optional, but at least one must be non-empty (400 otherwise);
 * - the same id cannot appear in both lists (400);
 * - adding a permission already assigned, or removing one that is not, is a no-op;
 * - an unknown permission id returns 404 and nothing is modified.
 */
export interface UpdateRolePermissionsRequest {
  /** Ids of the permissions to assign to the role. */
  add?: number[];
  /** Ids of the permissions to take away from the role. */
  remove?: number[];
}
