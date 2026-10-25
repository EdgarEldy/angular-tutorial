/**
 * Payload returned by POST /api/auth/login on success.
 *
 * The identity API returns a single opaque JWT string. All session data
 * (sub, roles, permissions, exp) is encoded inside the token payload and
 * decoded client-side by jwt.ts. No separate user-detail call is needed
 * just to establish the session.
 */
export interface AuthResponse {
  /** Signed JWT access token. Stored in localStorage under 'access_token'. */
  token: string;
}
