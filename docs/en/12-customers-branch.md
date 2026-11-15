# Branch: feature/customers

The customers branch introduces a master-detail layout: a paginated customer list
and a detail page that shows the customer's information plus the products they
ordered. The orders of a specific customer are loaded with a separate paginated
endpoint.

---

## Learning objectives

After studying this branch you will understand:

- How to build a master-detail layout with two independent paginated sections
- How `CustomerResponse.products` differs from a list of orders
- How to validate telephone numbers with a regex validator
- How `422` business rule errors work for a duplicate email

---

## Screens

| Route | What it shows |
|---|---|
| `/customers` | Paginated table with a name search; authenticated users |
| `/customers/:id` | Detail: customer info, ordered products, paginated order history |

---

## Detail page: two data sources

The detail page loads two things:

1. `GET /api/v1/customers/{id}` -- returns `CustomerResponse` which includes a
   `products: OrderedProductResponse[]` array. These are the product lines from all
   orders, one entry per order line. The page uses this to show a summary table of
   "products ordered" with quantities and totals.

2. `GET /api/v1/customers/{id}/orders` -- returns a paginated list of orders. The
   page shows this in a separate paginated table so the admin can browse the full
   order history.

The two tables have independent pagination signals:

```typescript
// Customer detail signals
customerPage = signal(0);
customerSize = signal(10);

// Orders sub-table signals (separate, never reset by the main table)
ordersPage = signal(0);
ordersSize = signal(5);
```

Changing the orders table page never resets the customer list page, and vice versa.

---

## OrderedProductResponse vs OrderResponse

`CustomerResponse.products` is `OrderedProductResponse[]`:

```typescript
interface OrderedProductResponse {
  order_id:     number;
  product_id:   number;
  product_name: string;
  unit_price:   number;
  quantity:     number;
  total:        number;
}
```

This is not an order list. It is a flat view of every product line across all of
the customer's orders, keyed by `order_id`. Use it for the "ordered products"
summary on the detail page. Use `GET /customers/{id}/orders` for the actual
paginated order list.

---

## Form validation in the dialog

The customer form validates:

| Field | Validation |
|---|---|
| `first_name`, `last_name` | Required, not blank |
| `email` | Required, valid email format |
| `telephone` | Required, matches `^\+?[0-9()\-\s]{7,20}$` |
| `address` | Required, not blank |

The telephone validator is a custom sync validator using `Validators.pattern`.

---

## 422 for duplicate email

Creating a customer with an email that already exists returns `422`. The dialog
shows the backend message inline and stays open:

```typescript
error: (err: AppError) => {
  if (err.kind === 'BUSINESS_RULE') {
    this.formError.set(err.message);
  }
}
```

---

## Key files

| File | Purpose |
|---|---|
| `features/customers/customers.ts` | HttpClient wrapper for /customers |
| `features/customers/models/` | CustomerRequest, CustomerResponse, OrderedProductResponse |
| `features/customers/pages/customer-list/customer-list.page.ts` | List with name search |
| `features/customers/pages/customer-detail/customer-detail.page.ts` | Detail + orders |
| `features/customers/dialogs/customer-form/customer-form.dialog.ts` | Create/edit form |
