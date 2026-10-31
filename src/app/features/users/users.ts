import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { PageResponse } from '../../shared/models/page-response.model';
import { UserResponse } from '../auth/models/user-response.model';
import { UpdateProfileRequest } from '../auth/models/update-profile-request.model';

/** Payload for the bulk-role assignment endpoint. */
export interface AssignRolesRequest {
  /** Complete set of role IDs to assign; replaces the current role set. */
  role_ids: number[];
}

/**
 * Service for the /api/v1/users resource.
 *
 * All endpoints require the ADMIN role except GET /api/v1/users/{id}, which is
 * also accessible to the account owner (handled by the backend; the frontend
 * does not need to distinguish these cases here).
 *
 * The user list returns UserResponse objects with an empty roles array; the
 * detail endpoint (GET /users/{id}) populates roles and is used by the
 * ManageRolesDialog to load the current role assignments for a user.
 *
 * Role assignment uses a single PUT /users/{id}/roles endpoint that replaces
 * the user's entire role set atomically, avoiding the ordering issues of
 * individual add/remove calls.
 */
@Injectable({ providedIn: 'root' })
export class Users {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

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
   * Updates a user's username and/or email.
   *
   * @param id - user id
   * @param body - optional new username and/or email
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
   * @returns Observable of the updated UserResponse reflecting the locked state
   */
  lockUser(id: number): Observable<UserResponse> {
    return this.http
      .patch<ApiResponse<UserResponse>>(`${this.base}/${id}/lock`, {})
      .pipe(map((res) => res.data));
  }

  /**
   * Unlocks a previously-locked user account.
   *
   * @param id - user id
   * @returns Observable of the updated UserResponse reflecting the unlocked state
   */
  unlockUser(id: number): Observable<UserResponse> {
    return this.http
      .patch<ApiResponse<UserResponse>>(`${this.base}/${id}/unlock`, {})
      .pipe(map((res) => res.data));
  }

  /**
   * Replaces the user's entire role set with the given role IDs.
   *
   * A single PUT replaces all roles atomically; this avoids ordering issues
   * that arise when adding and removing roles one at a time (e.g., removing
   * the last role could strip access before the new one is added).
   *
   * @param userId - user id
   * @param roleIds - complete new role ID set (may be empty to remove all roles)
   * @returns Observable of the updated UserResponse reflecting the new roles
   */
  assignRoles(userId: number, roleIds: number[]): Observable<UserResponse> {
    const body: AssignRolesRequest = { role_ids: roleIds };
    return this.http
      .put<ApiResponse<UserResponse>>(`${this.base}/${userId}/roles`, body)
      .pipe(map((res) => res.data));
  }
}
