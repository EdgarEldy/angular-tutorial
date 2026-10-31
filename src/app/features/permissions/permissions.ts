import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { PageResponse } from '../../shared/models/page-response.model';
import { PermissionResponse } from '../auth/models/user-response.model';
import { PermissionRequest } from './models/permission-request.model';

/**
 * Service for the /api/v1/permissions resource.
 *
 * All endpoints require the ADMIN role; the route guard enforces this before
 * the page loads. The service itself adds no UI logic -- it is a thin HTTP
 * wrapper that maps ApiResponse<T> down to its data field.
 *
 * getPermissions() uses the paginated endpoint with size=1000 and extracts
 * the content array. The permission count in a typical system is small
 * enough that a single large page is equivalent to a flat list.
 */
@Injectable({ providedIn: 'root' })
export class Permissions {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/permissions`;

  /**
   * Returns all permissions defined in the system.
   *
   * The backend endpoint is paginated; size=1000 fetches all permissions in
   * one call. The content array is extracted so callers receive a plain array.
   *
   * @returns Observable of PermissionResponse array
   */
  getPermissions(): Observable<PermissionResponse[]> {
    // HttpParams is immutable; each set() returns a new instance
    return this.http
      .get<ApiResponse<PageResponse<PermissionResponse>>>(this.base, {
        params: { size: 1000 },
      })
      .pipe(map((res) => res.data.content));
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
