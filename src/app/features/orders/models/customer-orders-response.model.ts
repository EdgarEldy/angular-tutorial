import { OrderCustomerResponse } from '../../customers/models/order-customer-response.model';
import { OrderedProductResponse } from '../../customers/models/ordered-product-response.model';

/**
 * One entry of the order list: a customer together with all of its orders.
 *
 * GET /api/v1/orders no longer returns one entry per order. It groups the
 * orders by customer, so a page of this endpoint is a page of customers
 * (only those having at least one order). Consequences for the UI:
 * - `PageResponse.totalElements` counts customers, not orders;
 * - `sort` applies to customer fields only (`id`, `lastName`, `firstName`);
 * - `customer.id` is the key to use when tracking entries in a template.
 *
 * The single-order endpoints (GET /orders/{id}, POST, PUT) still return an
 * `OrderResponse`. Field names mirror the API JSON exactly (snake_case).
 */
export interface CustomerOrdersResponse {
  /** The customer the orders belong to, without its own products or total. */
  customer: OrderCustomerResponse;
  /** One line per order of this customer (not per product). */
  products: OrderedProductResponse[];
  /** Sum of the customer's order lines, computed by the server. */
  total: number;
}
