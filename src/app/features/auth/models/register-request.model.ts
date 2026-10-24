/**
 * Payload sent to POST /api/auth/register.
 *
 * Registration creates a disabled account and triggers an activation email.
 * The backend validates each field and returns 400 with fieldErrors when
 * constraints are violated. Splitting first/last name at the API level lets
 * the backend store and display them independently (e.g., "Dear Jane,").
 */
export interface RegisterRequest {
  /** User's given name. */
  first_name: string;
  /** User's family name. */
  last_name: string;
  /** Unique email address used as the login identifier. */
  email: string;
  /** Plain-text password; the backend enforces minimum length and complexity. */
  password: string;
}
