import { ProductResponse } from '../../products/models/product-response.model';

/**
 * Response shape returned by GET /api/v1/customers and GET /api/v1/customers/{id}.
 *
 * Field names mirror the API JSON exactly (snake_case) so no transformation
 * is needed between the HTTP response and the component template.
 *
 * The `products` array is populated only by the detail endpoint
 * (GET /api/v1/customers/{id}); the list endpoint always returns it empty.
 * This design avoids sending a large dataset on every list request. The
 * CustomerDetailPage relies on this field to display the ordered products.
 *
 * ProductResponse is imported from the products feature because it is
 * already defined there and shared with the categories feature; importing
 * it here avoids duplicating the interface and creates no circular dependency.
 */
export interface CustomerResponse {
  /** Unique identifier. */
  id: number;
  /** Customer's given name. */
  first_name: string;
  /** Customer's family name. */
  last_name: string;
  /** Contact phone number. */
  telephone: string;
  /** Email address. Unique across all customers. */
  email: string;
  /** Street or mailing address. */
  address: string;
  /**
   * Products the customer has ordered.
   * Populated only on the detail endpoint; empty array on the list endpoint.
   */
  products: ProductResponse[];
}
