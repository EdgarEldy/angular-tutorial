/**
 * Payload returned by POST /api/v1/auth/login and POST /api/v1/auth/refresh-token
 * on success.
 *
 * The backend issues two tokens: a short-lived access token used for API calls
 * and a longer-lived refresh token used solely to obtain a new access token when
 * the current one expires. Both are stored in localStorage. The access token is
 * attached to every API request by authInterceptor; the refresh token is only
 * sent to the refresh endpoint.
 *
 * expires_in is the access-token lifetime in seconds. The frontend uses it to
 * schedule a silent refresh before the token expires so the user is not abruptly
 * logged out mid-session.
 */
export interface AuthResponse {
  /** Signed JWT access token. Stored in localStorage under 'access_token'. */
  access_token: string;
  /** Token scheme; always "Bearer" per RFC 6750. */
  token_type: string;
  /** Opaque refresh token. Stored in localStorage under 'refresh_token'. */
  refresh_token: string;
  /** Access-token lifetime in seconds (e.g. 3600 for one hour). */
  expires_in: number;
}
