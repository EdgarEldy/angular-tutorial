import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { PageResponse } from '../../shared/models/page-response.model';
import { RoleResponse } from '../auth/models/user-response.model';
import { RoleRequest } from './models/role-request.model';

/**
 * Service for the /api/v1/roles resource.
 *
 * All endpoints require the ADMIN role. The service handles CRUD for roles and
 * the two assignment endpoints that add or remove a permission from a role.
 *
 * Both assignment endpoints return the updated RoleResponse so the
 * ManagePermissionsDialog can refresh its chip list from the server's state
 * rather than computing the change locally -- this keeps the UI consistent
 * with any concurrent modifications.
 *
 * getRoles() uses the paginated endpoint with size=1000 and extracts the
 * content array. The role list is expected to be small enough that a single
 * large page is equivalent to a flat list, avoiding the need for client-side
 * pagination of role data.
 */
@Injectable({ providedIn: 'root' })
export class Roles {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/roles`;

  /**
   * Returns all roles with their nested permissions.
   *
   * The backend endpoint is paginated; size=1000 fetches all roles in one call.
   * The content array is extracted so callers receive a plain RoleResponse[].
   *
   * @returns Observable of RoleResponse array
   */
  getRoles(): Observable<RoleResponse[]> {
    // HttpParams is immutable; each set() returns a new instance
    return this.http
      .get<ApiResponse<PageResponse<RoleResponse>>>(this.base, {
        params: { size: 1000 },
      })
      .pipe(map((res) => res.data.content));
  }

  /**
   * Creates a new role.
   *
   * @param body - role_name field
   * @returns Observable of the created RoleResponse
   */
  createRole(body: RoleRequest): Observable<RoleResponse> {
    return this.http
      .post<ApiResponse<RoleResponse>>(this.base, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Updates a role's name.
   *
   * @param id - role id
   * @param body - updated role_name
   * @returns Observable of updated RoleResponse
   */
  updateRole(id: number, body: RoleRequest): Observable<RoleResponse> {
    return this.http
      .put<ApiResponse<RoleResponse>>(`${this.base}/${id}`, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Deletes a role by id.
   *
   * The backend returns 422 if the role is still assigned to at least one user.
   * The component surfaces that error and keeps the row.
   *
   * @param id - role id
   * @returns Observable<void>
   */
  deleteRole(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }

  /**
   * Assigns a permission to a role.
   *
   * @param roleId - role id
   * @param permissionId - permission id to add
   * @returns Observable of the updated RoleResponse (server-authoritative state)
   */
  addPermission(roleId: number, permissionId: number): Observable<RoleResponse> {
    return this.http
      .post<ApiResponse<RoleResponse>>(
        `${this.base}/${roleId}/permissions/${permissionId}`,
        {},
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Removes a permission from a role.
   *
   * @param roleId - role id
   * @param permissionId - permission id to remove
   * @returns Observable of the updated RoleResponse (server-authoritative state)
   */
  removePermission(
    roleId: number,
    permissionId: number,
  ): Observable<RoleResponse> {
    return this.http
      .delete<ApiResponse<RoleResponse>>(
        `${this.base}/${roleId}/permissions/${permissionId}`,
      )
      .pipe(map((res) => res.data));
  }
}
