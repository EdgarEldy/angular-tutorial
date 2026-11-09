/**
 * Payload sent to POST /api/v1/auth/reset-password?token=.
 *
 * The reset token is passed as a query parameter, not in the body. The backend
 * validates the token (existence, expiry, single-use) and updates the password
 * only when new_password and confirm_password match. A 400 response indicates
 * an invalid or expired token and is shown as a page-level error.
 */
export interface ResetPasswordRequest {
  /** The new password chosen by the user. */
  new_password: string;
  /** Must equal new_password; validated server-side as well as client-side. */
  confirm_password: string;
}
