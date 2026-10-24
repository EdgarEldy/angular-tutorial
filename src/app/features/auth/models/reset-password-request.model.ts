/**
 * Payload sent to POST /api/auth/reset-password.
 *
 * The token is taken from the query-string of the reset link emailed to the
 * user. The backend validates the token (existence, expiry, single-use) and
 * updates the password. A 400 response with a plain message indicates an
 * invalid or expired token and should be shown inline on the form.
 */
export interface ResetPasswordRequest {
  /** Single-use reset token extracted from the email link query parameter. */
  token: string;
  /** The new password chosen by the user. */
  new_password: string;
}
