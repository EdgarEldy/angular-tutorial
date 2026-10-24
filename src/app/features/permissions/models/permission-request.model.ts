/**
 * Request body for POST /api/permissions.
 *
 * Both fields are free text; the convention is UPPERCASE for resource
 * (e.g. 'PRODUCT') and UPPERCASE for action (e.g. 'READ'), which the backend
 * combines into the RESOURCE:ACTION string stored in JWT claims.
 */
export interface PermissionRequest {
  /** Resource the permission applies to (e.g. 'PRODUCT', 'ORDER'). */
  resource: string;
  /** Operation allowed on that resource (e.g. 'READ', 'WRITE', 'DELETE'). */
  action: string;
}
