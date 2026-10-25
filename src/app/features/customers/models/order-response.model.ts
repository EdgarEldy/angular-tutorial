import { CustomerResponse } from './customer-response.model';
import { ProductResponse } from '../../products/models/product-response.model';

/**
 * Response shape returned by GET /api/v1/customers/{id}/orders and
 * GET /api/v1/orders / GET /api/v1/orders/{id}.
 *
 * This model is defined in the customers feature because it is first needed
 * by the CustomerDetailPage (orders tab). The feature/orders branch will
 * import this model from here or redefine it in its own folder; the shapes
 * are identical in both cases.
 *
 * The `total` field is computed by the server (quantity * unit_price); the
 * UI never calculates it authoritatively for a saved order, only as a preview
 * while creating a new order. Always display the server's total once the
 * order exists.
 *
 * Both `customer` and `product` are embedded objects (not just IDs) so that
 * list views can show names without extra per-row requests.
 */
export interface OrderResponse {
  /** Unique identifier. */
  id: number;
  /** Full customer record embedded in the response. */
  customer: CustomerResponse;
  /** Full product record embedded in the response. */
  product: ProductResponse;
  /** Number of units ordered. Must be >= 1. */
  quantity: number;
  /** Total cost (quantity * unit_price), computed by the server. */
  total: number;
}
