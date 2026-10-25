/**
 * Request body for creating or updating a category (POST/PUT).
 *
 * Mirrors the API JSON exactly (snake_case). The backend validates that
 * category_name is not blank; the UI enforces the same rule with
 * Validators.required so the user gets immediate feedback.
 */
export interface CategoryRequest {
  /** The display name of the category. Required, not blank. */
  category_name: string;
}
