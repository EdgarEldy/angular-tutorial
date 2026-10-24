import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { PageResponse } from '../../shared/models/page-response.model';
import { UserResponse } from '../auth/models/user-response.model';
import { UpdateProfileRequest } from '../auth/models/update-profile-request.model';

/**
 * Service for the /api/users resource (Identity API).
 *
 * All endpoints require the ADMIN role except GET /api/users/{id}, which is
 * also accessible to the account owner (handled by the backend; the frontend
 * does not need to distinguish these cases here).
 *
 * The user list returns UserResponse objects with an empty roles array; the
 * detail endpoint (GET /users/{id}) populates roles and is used by the
 * ManageRolesDialog to load the current role assignments for a user.
 */
@Injectable({ providedIn: 'root' })
export class Users {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.identityApiUrl}/users`;

  /**
   * Returns a paginated list of users.
   *
   * The list response includes empty roles arrays; use getUser() for full detail.
   *
   * @param page - zero-based page index
   * @param size - items per page
   * @returns Observable of PageResponse<UserResponse>
   */
  getUsers(page = 0, size = 10): Observable<PageResponse<UserResponse>> {
    return this.http
      .get<ApiResponse<PageResponse<UserResponse>>>(this.base, {
        params: { page, size },
      })
      .pipe(map((res) => res.data));
  }

  /**
   * Returns a single user with their roles and permissions.
   *
   * Used by ManageRolesDialog to load the current role set before showing
   * the assignment UI.
   *
   * @param id - user id
   * @returns Observable of UserResponse with populated roles array
   */
  getUser(id: number): Observable<UserResponse> {
    return this.http
      .get<ApiResponse<UserResponse>>(`${this.base}/${id}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Updates a user's first and last name.
   *
   * @param id - user id
   * @param body - first_name and last_name
   * @returns Observable of updated UserResponse
   */
  updateUser(id: number, body: UpdateProfileRequest): Observable<UserResponse> {
    return this.http
      .put<ApiResponse<UserResponse>>(`${this.base}/${id}`, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Deletes a user account.
   *
   * The UI disables this action on the currently-logged-in admin's own row.
   *
   * @param id - user id
   * @returns Observable<void>
   */
  deleteUser(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }

  /**
   * Locks a user account, preventing login.
   *
   * The backend returns 422 if the admin tries to lock their own account.
   * The UI disables the lock button for the current user's own row.
   *
   * @param id - user id
   * @returns Observable<void>
   */
  lockUser(id: number): Observable<void> {
    return this.http
      .patch<ApiResponse<void>>(`${this.base}/${id}/lock`, {})
      .pipe(map(() => undefined));
  }

  /**
   * Unlocks a previously-locked user account.
   *
   * @param id - user id
   * @returns Observable<void>
   */
  unlockUser(id: number): Observable<void> {
    return this.http
      .patch<ApiResponse<void>>(`${this.base}/${id}/unlock`, {})
      .pipe(map(() => undefined));
  }

  /**
   * Assigns a role to a user.
   *
   * @param userId - user id
   * @param roleId - role id to assign
   * @returns Observable of updated UserResponse (server-authoritative state)
   */
  addRole(userId: number, roleId: number): Observable<UserResponse> {
    return this.http
      .post<ApiResponse<UserResponse>>(
        `${this.base}/${userId}/roles/${roleId}`,
        {},
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Removes a role from a user.
   *
   * @param userId - user id
   * @param roleId - role id to remove
   * @returns Observable of updated UserResponse (server-authoritative state)
   */
  removeRole(userId: number, roleId: number): Observable<UserResponse> {
    return this.http
      .delete<ApiResponse<UserResponse>>(
        `${this.base}/${userId}/roles/${roleId}`,
      )
      .pipe(map((res) => res.data));
  }
}
