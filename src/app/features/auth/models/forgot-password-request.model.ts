/**
 * Payload sent to POST /api/auth/forgot-password.
 *
 * Only the email is required. The backend locates the account and sends a
 * reset link regardless of whether the address exists, so the UI can always
 * show the same neutral confirmation message without leaking whether a given
 * email is registered.
 */
export interface ForgotPasswordRequest {
  /** Email address of the account for which a password reset is requested. */
  email: string;
}
