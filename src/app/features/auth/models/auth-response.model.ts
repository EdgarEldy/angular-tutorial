/**
 * Payload returned by POST /api/v1/auth/login on success.
 *
 * The backend returns a JWT string along with the token type (always "Bearer")
 * and the authenticated username. The username is included here so the shell
 * can display it immediately after login without waiting for a GET /auth/me call.
 * All session data (roles, permissions, exp) is still encoded inside the token
 * payload and decoded client-side by jwt.ts.
 */
export interface AuthResponse {
  /** Signed JWT access token. Stored in localStorage under 'access_token'. */
  token: string;
  /** Token scheme; always "Bearer" per RFC 6750. */
  token_type: string;
  /** The authenticated user's username (same value as the JWT sub claim). */
  username: string;
}
