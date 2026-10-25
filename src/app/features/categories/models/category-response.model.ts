import { ProductResponse } from '../../products/models/product-response.model';

/**
 * Response model for a single category resource from the Business API.
 *
 * Mirrors the API JSON exactly (snake_case). The products array is populated
 * only on the detail endpoint (GET /api/v1/categories/{id}); the paginated
 * list endpoint returns an empty products array. This distinction means the
 * list page must not try to render products -- it works purely from
 * category_name, created_at and updated_at.
 *
 * ProductResponse is imported from the products feature because the categories
 * and products features share that type. Defining it in one place avoids drift.
 */
export interface CategoryResponse {
  /** Unique identifier. */
  id: number;
  /** Display name of the category. */
  category_name: string;
  /** ISO 8601 creation timestamp returned by the backend. */
  created_at: string;
  /** ISO 8601 last-update timestamp returned by the backend. */
  updated_at: string;
  /**
   * Products belonging to this category.
   * Always an empty array in paginated list responses.
   * Populated in the single-category detail response.
   */
  products: ProductResponse[];
}
