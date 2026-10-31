/**
 * Payload sent to PUT /api/v1/users/{id} to update the authenticated user's profile.
 *
 * All fields are optional: the caller only sends the properties they want to
 * change. Sending an empty object is a no-op on the server. The backend validates
 * uniqueness of the new username and email when provided and returns 409 on conflict.
 */
export interface UpdateProfileRequest {
  /** New username; must be unique. Omit to leave unchanged. */
  username?: string;
  /** New email address. Omit to leave unchanged. */
  email?: string;
}
