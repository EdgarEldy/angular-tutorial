/**
 * Payload sent to POST /api/v1/auth/register.
 *
 * Registration creates a disabled account and triggers an activation email.
 * The backend validates each field and returns 400 with fieldErrors when
 * constraints are violated. The username becomes the JWT subject (sub claim)
 * and must be unique across all accounts.
 *
 * confirm_password is validated server-side to ensure both password fields
 * match. The frontend performs the same check with a cross-field validator
 * before submitting so the user gets immediate feedback.
 */
export interface RegisterRequest {
  /** User's given name (not used for login; display only). */
  first_name: string;
  /** User's family name (not used for login; display only). */
  last_name: string;
  /** Unique username used as the login identifier and JWT subject. */
  username: string;
  /** Email address where the activation link will be sent. */
  email: string;
  /** Plain-text password; the backend enforces minimum length. */
  password: string;
  /** Must equal password; validated server-side as well as client-side. */
  confirm_password: string;
}
