/**
 * Request body sent to POST /api/v1/orders and PUT /api/v1/orders/{id}.
 *
 * Field names mirror the API JSON exactly (snake_case) so Angular's HttpClient
 * can serialize the object directly without a mapping layer.
 *
 * The `total` is NOT included here because it is computed by the server
 * (quantity * unit_price). Sending a client-calculated total would create a
 * discrepancy if prices change concurrently. The UI shows a preview but always
 * displays the server's authoritative total once the order is saved.
 */
export interface OrderRequest {
  /** Id of the customer placing the order. Required. */
  customer_id: number;
  /** Id of the product being ordered. Required. */
  product_id: number;
  /** Number of units ordered. Must be >= 1. */
  quantity: number;
}
