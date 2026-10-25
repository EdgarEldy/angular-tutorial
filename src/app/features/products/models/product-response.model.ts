/**
 * Response model for a single product resource from the Business API.
 *
 * Mirrors the JSON shape exactly, including snake_case fields, so there is
 * no mapping layer between the API and the UI. The category_name is
 * denormalized by the backend so every product row can be shown with its
 * category without an extra request per row.
 *
 * This model is shared between the products and categories features:
 * CategoryResponse.products is an array of ProductResponse, and the
 * ProductsService uses it directly. Defining it here (products feature) lets
 * the categories feature import it without a circular dependency.
 */
export interface ProductResponse {
  /** Unique identifier. */
  id: number;
  /** Display name of the product. */
  product_name: string;
  /** Price per unit. Must be greater than 0. */
  unit_price: number;
  /** Foreign key to the parent category. */
  category_id: number;
  /** Denormalized category name for display without an extra request. */
  category_name: string;
}
