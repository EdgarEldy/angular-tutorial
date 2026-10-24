/**
 * JWT payload claims embedded by the identity API at login time.
 *
 * The frontend never verifies the cryptographic signature -- that check
 * happens on every API request on the server. The client only reads claims
 * to drive local routing decisions (guards, directive visibility) and to
 * avoid sending a known-expired token.
 */
export interface JwtClaims {
  /** Subject: the user's email address. */
  sub: string;
  /** Role names assigned to the user (e.g. ['ADMIN', 'USER']). */
  roles: string[];
  /** Permissions in RESOURCE:ACTION format (e.g. ['PRODUCT:READ']). */
  permissions: string[];
  /** Expiry as a Unix timestamp in seconds (not milliseconds). */
  exp: number;
  /** Unique token ID used by the server-side blacklist on logout. */
  jti: string;
}

/**
 * Decodes the payload segment of a JWT without verifying the signature.
 *
 * A JWT consists of three base64url-encoded segments separated by dots:
 * header.payload.signature. Only the payload (index 1) carries the claims
 * the frontend cares about.
 *
 * base64url uses '-' and '_' instead of '+' and '/' to be URL-safe.
 * atob() only handles standard base64, so those two characters must be
 * swapped before decoding.
 *
 * @param token - raw JWT string as stored in localStorage
 * @returns decoded JwtClaims, or null if the token is malformed
 */
export function decodeJwt(token: string): JwtClaims | null {
  try {
    // Split into [header, payload, signature]; take the middle segment
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;

    // Convert base64url to standard base64 before decoding
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as JwtClaims;
  } catch {
    // Malformed token -- treat as absent rather than throwing
    return null;
  }
}

/**
 * Returns true when the token's expiry claim has not yet passed.
 *
 * exp is expressed in Unix seconds; Date.now() returns milliseconds, so
 * the comparison multiplies exp by 1000. A one-second tolerance is not
 * added here: the interceptor will simply let the request go through and
 * the server will respond with 401, which the errorInterceptor handles.
 *
 * @param claims - decoded JWT claims returned by decodeJwt
 * @returns true if the token is still valid (not expired)
 */
export function isTokenValid(claims: JwtClaims): boolean {
  // exp is in seconds; Date.now() is in milliseconds
  return claims.exp * 1000 > Date.now();
}
