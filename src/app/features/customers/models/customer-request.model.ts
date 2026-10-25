/**
 * Request body for POST /api/v1/customers and PUT /api/v1/customers/{id}.
 *
 * Field names match the JSON contract exactly (snake_case) so no mapping
 * layer is needed between the form value and the HTTP request body. The
 * backend enforces all validation rules; the UI mirrors them for a better UX.
 *
 * Validation rules (mirrored in CustomerFormDialog):
 *  - first_name, last_name: required (not blank)
 *  - email: required, valid email format; must be unique (422 on conflict)
 *  - telephone: required, matches ^\+?[0-9()\-\s]{7,20}$
 *  - address: required (not blank)
 */
export interface CustomerRequest {
  /** Customer's given name. Required, not blank. */
  first_name: string;
  /** Customer's family name. Required, not blank. */
  last_name: string;
  /** Contact phone number. Required, pattern ^\+?[0-9()\-\s]{7,20}$. */
  telephone: string;
  /** Email address. Required, valid format, unique across all customers. */
  email: string;
  /** Street or mailing address. Required, not blank. */
  address: string;
}
