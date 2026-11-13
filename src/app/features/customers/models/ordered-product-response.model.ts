/**
 * One order line as embedded in a customer: a product together with the
 * order that bought it.
 *
 * Returned inside `CustomerResponse.products` (list and detail) and inside
 * the grouped order list of GET /api/v1/orders. Field names mirror the API
 * JSON exactly (snake_case), so no mapping layer is needed.
 *
 * Despite the name of the array that holds it, there is one entry per ORDER,
 * not per product: a product ordered twice appears twice, each time with its
 * own `order_id`, `quantity` and `total`. `order_id` is therefore the stable
 * key to use when tracking rows in a template, never `product_id`.
 */
export interface OrderedProductResponse {
  /** Id of the order this line comes from. Unique within the array. */
  order_id: number;
  /** Id of the ordered product. May repeat across lines. */
  product_id: number;
  /** Display name of the ordered product. */
  product_name: string;
  /** Price of one unit of the product. */
  unit_price: number;
  /** Number of units bought in this order. */
  quantity: number;
  /** Total of this line, computed by the server. */
  total: number;
}
