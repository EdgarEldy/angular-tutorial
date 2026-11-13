/**
 * Customer as embedded in an order: identity and contact fields only.
 *
 * Returned as `customer` by the order endpoints. It is deliberately lighter
 * than `CustomerResponse`: it carries neither `products` nor `total`.
 * Embedding the full customer in every order would nest the customer's whole
 * order history inside each of its orders, repeating the same data many
 * times in one response.
 *
 * Field names mirror the API JSON exactly (snake_case), so no mapping layer
 * is needed. A separate interface, rather than `Omit<CustomerResponse, ...>`,
 * keeps the model a direct transcription of the OpenAPI schema.
 */
export interface OrderCustomerResponse {
  /** Unique identifier of the customer. */
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
}
