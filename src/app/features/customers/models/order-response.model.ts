import { OrderCustomerResponse } from './order-customer-response.model';
import { ProductResponse } from '../../products/models/product-response.model';

/**
 * A single order, as returned by the endpoints that deal with one order at a
 * time: GET /api/v1/orders/{id}, POST /api/v1/orders, PUT /api/v1/orders/{id}
 * and each entry of GET /api/v1/customers/{id}/orders.
 *
 * It is NOT the shape of the order list: GET /api/v1/orders groups orders by
 * customer and returns CustomerOrdersResponse entries instead.
 *
 * This model is defined in the customers feature because it is first needed
 * by the CustomerDetailPage. The orders feature imports it from here.
 *
 * The `total` field is computed by the server (quantity * unit_price); the
 * UI never calculates it authoritatively for a saved order, only as a preview
 * while creating a new order. Always display the server's total once the
 * order exists.
 *
 * Both `customer` and `product` are embedded objects (not just IDs) so that
 * views can show names without extra requests.
 */
export interface OrderResponse {
  /** Unique identifier. */
  id: number;
  /** Customer who placed the order: identity and contact fields only. */
  customer: OrderCustomerResponse;
  /** Full product record embedded in the response. */
  product: ProductResponse;
  /** Number of units ordered. Must be >= 1. */
  quantity: number;
  /** Total cost (quantity * unit_price), computed by the server. */
  total: number;
}
