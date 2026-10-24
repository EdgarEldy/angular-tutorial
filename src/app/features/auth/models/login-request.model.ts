/**
 * Payload sent to POST /api/auth/login.
 *
 * The API accepts email + password in plain text over HTTPS and returns a
 * short-lived JWT. Field names mirror the backend exactly (snake_case) so
 * no mapping layer is needed between the form value and the request body.
 */
export interface LoginRequest {
  /** User's registered email address. */
  email: string;
  /** Plain-text password (transmitted only over HTTPS). */
  password: string;
}
