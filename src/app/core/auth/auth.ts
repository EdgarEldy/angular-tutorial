import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { AuthResponse } from '../../features/auth/models/auth-response.model';
import { LoginRequest } from '../../features/auth/models/login-request.model';
import { RegisterRequest } from '../../features/auth/models/register-request.model';
import { ForgotPasswordRequest } from '../../features/auth/models/forgot-password-request.model';
import { ResetPasswordRequest } from '../../features/auth/models/reset-password-request.model';
import { UpdateProfileRequest } from '../../features/auth/models/update-profile-request.model';
import { UserResponse } from '../../features/auth/models/user-response.model';
import { JwtClaims, decodeJwt, isTokenValid } from './jwt';

/** localStorage key under which the JWT is persisted across page reloads. */
const TOKEN_KEY = 'access_token';

/**
 * Core session service for the application.
 *
 * Manages the JWT lifecycle (storage, decoding, expiry) and exposes reactive
 * signals that guards, directives, and components consume to make access
 * decisions without querying the backend on every navigation.
 *
 * Responsibilities:
 * - Persist and restore the token from localStorage.
 * - Decode the token payload into typed JwtClaims via jwt.ts.
 * - Provide computed signals (isAuthenticated, isAdmin, roles, permissions)
 *   that update automatically when the token changes.
 * - Execute all HTTP calls related to the auth resource (login, register,
 *   logout, activate, forgot/reset password, profile).
 *
 * This service intentionally contains NO navigation or snackbar calls.
 * Side effects that depend on UI (redirects, toasts) belong in components or
 * the app initializer that bootstraps the session.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ---------------------------------------------------------------------------
  // Session state signals
  // ---------------------------------------------------------------------------

  /**
   * The raw JWT string, or null when the user is not logged in.
   * Writing to this signal automatically propagates to all computed signals.
   */
  readonly token = signal<string | null>(this.loadStoredToken());

  /**
   * Decoded JWT payload, or null when no valid token is present.
   * computed() re-evaluates automatically whenever token() changes.
   */
  readonly claims = computed<JwtClaims | null>(() => {
    const t = this.token();
    return t ? decodeJwt(t) : null;
  });

  /**
   * True only when a token exists AND its expiry claim is still in the future.
   * Guards use this to decide whether to allow or redirect a navigation.
   */
  readonly isAuthenticated = computed<boolean>(() => {
    const c = this.claims();
    return c !== null && isTokenValid(c);
  });

  /** True when the authenticated user holds the ADMIN role. */
  readonly isAdmin = computed<boolean>(() => this.hasRole('ADMIN'));

  /**
   * Role names extracted from the JWT payload.
   * Falls back to an empty array when not authenticated.
   */
  readonly roles = computed<string[]>(() => this.claims()?.roles ?? []);

  /**
   * Permissions in RESOURCE:ACTION format extracted from the JWT payload.
   * Falls back to an empty array when not authenticated.
   */
  readonly permissions = computed<string[]>(() => this.claims()?.permissions ?? []);

  /**
   * Full user object loaded via GET /auth/me, populated after login and
   * session restore. Null until the HTTP call completes or if the call fails.
   */
  readonly currentUser = signal<UserResponse | null>(null);

  // ---------------------------------------------------------------------------
  // Role and permission helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns true when the current user holds the given role.
   *
   * Comparison is case-insensitive so that 'admin' and 'ADMIN' both match,
   * guarding against accidental casing differences between call sites.
   *
   * @param role - role name to check (e.g. 'ADMIN')
   * @returns true if the role is in the JWT claims
   */
  hasRole(role: string): boolean {
    return this.roles().some((r) => r.toUpperCase() === role.toUpperCase());
  }

  /**
   * Returns true when the current user holds at least one of the given roles.
   *
   * @param roles - one or more role names; any match returns true
   * @returns true if any role is present in the JWT claims
   */
  hasAnyRole(...roles: string[]): boolean {
    return roles.some((r) => this.hasRole(r));
  }

  /**
   * Returns true when the current user holds the given permission.
   *
   * Comparison is case-insensitive (e.g. 'product:read' matches 'PRODUCT:READ').
   *
   * @param permission - permission string in RESOURCE:ACTION format
   * @returns true if the permission is in the JWT claims
   */
  hasPermission(permission: string): boolean {
    return this.permissions().some(
      (p) => p.toUpperCase() === permission.toUpperCase(),
    );
  }

  /**
   * Returns true when the current user holds at least one of the given permissions.
   *
   * @param permissions - one or more RESOURCE:ACTION strings; any match returns true
   * @returns true if any permission is present in the JWT claims
   */
  hasAnyPermission(...permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  // ---------------------------------------------------------------------------
  // HTTP methods
  // ---------------------------------------------------------------------------

  /**
   * Registers a new user account.
   *
   * The account is created in a disabled state; the user must click the
   * activation link in the confirmation email before logging in.
   *
   * @param payload - registration form data
   * @returns observable that emits the created UserResponse on success
   */
  register(payload: RegisterRequest): Observable<UserResponse> {
    return this.http
      .post<ApiResponse<UserResponse>>(`${this.base}/auth/register`, payload)
      .pipe(map((res) => res.data));
  }

  /**
   * Authenticates the user and stores the returned JWT.
   *
   * On success the token signal is updated, which causes all computed signals
   * (isAuthenticated, roles, permissions) to re-evaluate synchronously.
   * loadCurrentUser() is called to populate the currentUser signal.
   *
   * The 401 case on this specific endpoint must NOT trigger the global
   * UNAUTHENTICATED handler (which would redirect to /login). The login page
   * catches the 401 itself and shows the backend message in the form.
   *
   * @param payload - credentials entered in the login form
   * @returns observable that emits the AuthResponse containing the JWT
   */
  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.base}/auth/login`, payload)
      .pipe(
        map((res) => res.data),
        tap((authResponse) => this.storeToken(authResponse.token)),
      );
  }

  /**
   * Logs out the current user.
   *
   * Calls POST /auth/logout to invalidate the token's JTI on the server-side
   * blacklist, then unconditionally clears the local session regardless of
   * whether the HTTP call succeeds. This prevents a stuck logged-in state
   * when the backend is unreachable.
   *
   * @returns observable that completes after the session has been cleared
   */
  logout(): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.base}/auth/logout`, {})
      .pipe(
        map(() => undefined),
        // Clear session even if the logout request fails (network error, 401)
        catchError(() => of(undefined)),
        tap(() => this.clearSession()),
      );
  }

  /**
   * Activates an account using the token from the email link.
   *
   * The endpoint is GET /api/v1/auth/activate?token=... and returns the
   * activated UserResponse on success. The activation page can use the
   * response to display the username and invite the user to log in.
   *
   * @param token - activation token extracted from the ?token= query parameter
   * @returns observable that emits the activated UserResponse or errors with AppError
   */
  activateAccount(token: string): Observable<UserResponse> {
    return this.http
      .get<ApiResponse<UserResponse>>(`${this.base}/auth/activate`, {
        params: { token },
      })
      .pipe(map((res) => res.data));
  }

  /**
   * Requests a password-reset email for the given address.
   *
   * The backend always responds with 200 regardless of whether the address
   * is registered, so the UI can show the same neutral message to prevent
   * user enumeration.
   *
   * @param payload - object containing the email address
   * @returns observable that completes when the server acknowledges the request
   */
  forgotPassword(payload: ForgotPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.base}/auth/forgot-password`, payload)
      .pipe(map(() => undefined));
  }

  /**
   * Sets a new password using the single-use reset token from the email link.
   *
   * A 400 from this endpoint signals an invalid or expired token (not a
   * field-validation error) and is shown as a plain message on the page.
   *
   * @param payload - reset token + new password
   * @returns observable that completes on success
   */
  resetPassword(payload: ResetPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.base}/auth/reset-password`, payload)
      .pipe(map(() => undefined));
  }

  /**
   * Loads the authenticated user's profile from GET /auth/me.
   *
   * Populates the currentUser signal used by the profile page and the shell
   * toolbar. Called after login and during session restore at startup.
   *
   * Errors are swallowed so a failed /auth/me call does not crash the app;
   * the signal simply remains null and pages that need it show a retry state.
   *
   * @returns observable that emits the UserResponse, or null on error
   */
  loadCurrentUser(): Observable<UserResponse | null> {
    return this.http
      .get<ApiResponse<UserResponse>>(`${this.base}/auth/me`)
      .pipe(
        map((res) => res.data),
        tap((user) => this.currentUser.set(user)),
        catchError(() => {
          this.currentUser.set(null);
          return of(null);
        }),
      );
  }

  /**
   * Fetches the current user's profile and propagates any HTTP error to the caller.
   *
   * Unlike loadCurrentUser(), this method does NOT swallow errors. It is intended
   * for use in the ProfilePage where an error state with a retry button is needed.
   * loadCurrentUser() is kept for the app initializer and post-login flows where
   * a failure should simply leave the session state unchanged.
   *
   * @returns observable that emits the UserResponse on success or errors with AppError
   */
  getProfile(): Observable<UserResponse> {
    return this.http
      .get<ApiResponse<UserResponse>>(`${this.base}/auth/me`)
      .pipe(
        map((res) => res.data),
        tap((user) => this.currentUser.set(user)),
      );
  }

  /**
   * Updates the authenticated user's profile (username and/or email).
   *
   * @param userId - numeric ID of the user to update (from currentUser signal)
   * @param payload - optional new username and/or email values
   * @returns observable that emits the updated UserResponse
   */
  updateProfile(userId: number, payload: UpdateProfileRequest): Observable<UserResponse> {
    return this.http
      .put<ApiResponse<UserResponse>>(`${this.base}/users/${userId}`, payload)
      .pipe(
        map((res) => res.data),
        tap((user) => this.currentUser.set(user)),
      );
  }

  // ---------------------------------------------------------------------------
  // Session helpers
  // ---------------------------------------------------------------------------

  /**
   * Persists the JWT to localStorage and updates the token signal.
   *
   * Writing to the signal triggers immediate synchronous re-evaluation of all
   * computed signals (isAuthenticated, roles, etc.) because Angular's signal
   * graph is synchronous.
   *
   * @param token - raw JWT string to persist
   */
  storeToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

  /**
   * Removes the token from localStorage and resets all session signals to null.
   *
   * Called by logout() and by provideAppInitializer when the stored token is
   * found to be expired at startup.
   */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  /**
   * Reads the token from localStorage at service construction time.
   *
   * The service is provided in root so it is instantiated once at startup.
   * Reading from localStorage here restores the session across page reloads
   * without requiring an async initializer. The token is later validated by
   * provideAppInitializer which calls loadCurrentUser() to confirm it is
   * still accepted by the server.
   *
   * @returns the stored JWT string, or null if no token is found
   */
  private loadStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
