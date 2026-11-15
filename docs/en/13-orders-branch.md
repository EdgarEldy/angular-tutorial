# Branch: feature/orders

The orders branch completes the tutorial. It depends on both the products and
customers branches because the order create/edit dialog needs selects for both.

---

## Learning objectives

After studying this branch you will understand:

- How to populate multiple selects in a dialog from two different services
- How to show a client-side "estimated total" preview and then replace it with
  the server's authoritative `total`
- How the `CustomerOrdersResponse` grouping works and how to flatten it for display
- How to filter orders by customer or product

---

## Screens

| Route | What it shows |
|---|---|
| `/orders` | Paginated table with customer and product filters; authenticated |
| `/orders/:id` | Detail: customer info + product info + quantity + total |

---

## Create/edit dialog: two selects

The order dialog loads two lists on open:

1. `GET /api/v1/customers?size=100` -- all customers for the customer select
2. `GET /api/v1/products?size=100` -- all products for the product select

Both are loaded in parallel with `forkJoin`:

```typescript
ngOnInit(): void {
  forkJoin({
    customers: this.customersService.getCustomers(0, 100),
    products:  this.productsService.getProducts(0, 100),
  }).subscribe(({ customers, products }) => {
    this.customers.set(customers.content);
    this.products.set(products.content);
  });
}
```

Using a large `size` (100) loads all options in one call, avoiding the complexity
of a paginated select inside a dialog.

---

## Estimated total preview

The form shows a "Estimated total" row calculated client-side from
`quantity * unit_price`. This is clearly labelled as an estimate. After the order
is saved, the page shows the server's `total` field, which is the authoritative
value:

```typescript
// Client-side preview (clearly labelled "Estimate")
estimatedTotal = computed(() => {
  const product = this.selectedProduct();
  const qty     = this.form.controls.quantity.value;
  return product && qty ? product.unit_price * qty : 0;
});
```

Never send `total` to the backend in the create or update body. The server computes
it. Never display `estimatedTotal` as the final total after the order is saved.

---

## CustomerOrdersResponse: grouped then flattened

`GET /api/v1/orders` returns a paginated `CustomerOrdersResponse`:

```typescript
interface CustomerOrdersResponse {
  customer: OrderCustomerResponse;
  products: OrderedProductResponse[];  // order lines for this customer
  total:    number;                    // sum for this customer
}
```

Each entry groups one customer with their order lines. To show a flat table with
one row per order line, flatten the response:

```typescript
interface OrderRow {
  customer:     OrderCustomerResponse;
  order_id:     number;
  product_name: string;
  quantity:     number;
  total:        number;
}

// Flatten CustomerOrdersResponse[] into OrderRow[]
const rows: OrderRow[] = data.flatMap(group =>
  group.products.map(p => ({
    customer:     group.customer,
    order_id:     p.order_id,
    product_name: p.product_name,
    quantity:     p.quantity,
    total:        p.total,
  }))
);
```

---

## Filter parameters

| Filter | Control | Sends as |
|---|---|---|
| Customer | Select | `customerId` |
| Product | Select | `productId` |

Both filters are optional. Use the same omit-when-empty pattern as in the products
branch.

---

## Key files

| File | Purpose |
|---|---|
| `features/orders/orders.ts` | HttpClient wrapper for /orders |
| `features/orders/models/` | OrderRequest, OrderResponse, CustomerOrdersResponse |
| `features/orders/pages/order-list/order-list.page.ts` | Filtered list with flattened rows |
| `features/orders/pages/order-detail/order-detail.page.ts` | Order detail |
| `features/orders/dialogs/order-form/order-form.dialog.ts` | Create/edit with two selects |
