import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { PermissionResponse } from '../auth/models/user-response.model';
import { PermissionRequest } from './models/permission-request.model';

/**
 * Service for the /api/permissions resource (Identity API).
 *
 * All endpoints require the ADMIN role; the route guard enforces this before
 * the page loads. The service itself adds no UI logic -- it is a thin HTTP
 * wrapper that maps ApiResponse<T> down to its data field.
 *
 * Permissions are returned as a plain array (not paginated) because the total
 * number of permissions in a typical system is small enough to load in one
 * request and display in a flat table.
 */
@Injectable({ providedIn: 'root' })
export class Permissions {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.identityApiUrl}/permissions`;

  /**
   * Returns all permissions defined in the system.
   *
   * @returns Observable of PermissionResponse array
   */
  getPermissions(): Observable<PermissionResponse[]> {
    return this.http
      .get<ApiResponse<PermissionResponse[]>>(this.base)
      .pipe(map((res) => res.data));
  }

  /**
   * Creates a new permission.
   *
   * @param body - resource and action fields
   * @returns Observable of the created PermissionResponse
   */
  createPermission(body: PermissionRequest): Observable<PermissionResponse> {
    return this.http
      .post<ApiResponse<PermissionResponse>>(this.base, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Deletes a permission by id.
   *
   * The backend returns 422 if the permission is still assigned to a role.
   * The component is responsible for surfacing that error message.
   *
   * @param id - permission id
   * @returns Observable<void>
   */
  deletePermission(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }
}
