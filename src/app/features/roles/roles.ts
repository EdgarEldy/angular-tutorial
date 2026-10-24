import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { RoleResponse } from '../auth/models/user-response.model';
import { RoleRequest } from './models/role-request.model';

/**
 * Service for the /api/roles resource (Identity API).
 *
 * All endpoints require the ADMIN role. The service handles CRUD for roles and
 * the two assignment endpoints that add or remove a permission from a role.
 *
 * Both assignment endpoints return the updated RoleResponse so the
 * ManagePermissionsDialog can refresh its chip list from the server's state
 * rather than computing the change locally -- this keeps the UI consistent
 * with any concurrent modifications.
 */
@Injectable({ providedIn: 'root' })
export class Roles {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.identityApiUrl}/roles`;

  /**
   * Returns all roles with their nested permissions.
   *
   * @returns Observable of RoleResponse array
   */
  getRoles(): Observable<RoleResponse[]> {
    return this.http
      .get<ApiResponse<RoleResponse[]>>(this.base)
      .pipe(map((res) => res.data));
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
