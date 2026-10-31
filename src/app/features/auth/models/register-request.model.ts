/**
 * Payload sent to POST /api/v1/auth/register.
 *
 * Registration creates a disabled account and triggers an activation email.
 * The backend validates each field and returns 400 with fieldErrors when
 * constraints are violated. The username becomes the JWT subject (sub claim)
 * and must be unique across all accounts.
 */
export interface RegisterRequest {
  /** Unique username used as the login identifier and JWT subject. */
  username: string;
  /** Email address where the activation link will be sent. */
  email: string;
  /** Plain-text password; the backend enforces minimum length and complexity. */
  password: string;
}
