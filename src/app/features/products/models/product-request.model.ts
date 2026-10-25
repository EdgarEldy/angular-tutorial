/**
 * Request body for creating or updating a product.
 *
 * Mirrors the JSON payload the Business API expects for
 * POST /api/v1/products and PUT /api/v1/products/{id}.
 * Fields are snake_case to match the API contract without a mapping layer.
 *
 * Validation rules enforced by the backend (mirrored as UX validation):
 *  - category_id: required (the category must exist; 404 if not)
 *  - product_name: required, not blank
 *  - unit_price: required, greater than 0
 */
export interface ProductRequest {
  /** Foreign key to the parent category. Must reference an existing category. */
  category_id: number;
  /** Display name of the product. Must not be blank. */
  product_name: string;
  /** Price per unit. Must be strictly greater than 0. */
  unit_price: number;
}
