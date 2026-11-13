import { OrderedProductResponse } from './ordered-product-response.model';

/**
 * Response shape returned by GET /api/v1/customers and GET /api/v1/customers/{id}.
 *
 * Field names mirror the API JSON exactly (snake_case) so no transformation
 * is needed between the HTTP response and the component template.
 *
 * The `products` array holds one entry per order line, not per distinct product.
 * A product ordered twice appears twice, each with its own `order_id`. It is
 * populated only by the detail endpoint (GET /api/v1/customers/{id}); the list
 * endpoint always returns it empty to avoid sending a large dataset on every
 * list request. `total` is the customer's overall spending sum across all orders
 * (0 when the customer has never ordered).
 *
 * OrderedProductResponse is defined in the same models folder: each line carries
 * the order it belongs to (order_id), the product details, the quantity and the
 * line total. Using a dedicated interface instead of ProductResponse avoids
 * merging unrelated fields and matches the contract shape exactly.
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
   * Order lines for this customer.
   * One entry per order: a product ordered twice gives two lines, each with
   * a different order_id. Populated only on the detail endpoint; empty on
   * the list endpoint.
   */
  products: OrderedProductResponse[];
  /**
   * Customer's overall spending total, computed by the server.
   * 0 when the customer has never placed an order.
   */
  total: number;
}
