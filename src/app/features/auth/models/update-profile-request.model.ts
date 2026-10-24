/**
 * Payload sent to PUT /api/users/{id} to update the authenticated user's profile.
 *
 * Only first and last name are editable through this endpoint. Email changes
 * require a separate, verified flow not covered in this branch. Keeping the
 * request model minimal prevents accidental over-posting of fields the
 * backend does not expect.
 */
export interface UpdateProfileRequest {
  /** Updated given name. */
  first_name: string;
  /** Updated family name. */
  last_name: string;
}
