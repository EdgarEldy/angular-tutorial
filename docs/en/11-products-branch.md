# Branch: feature/products

The products branch adds a list page with four simultaneous filter controls and a
create/edit dialog that includes a category selector. It also introduces the `409`
conflict error for optimistic locking.

---

## Learning objectives

After studying this branch you will understand:

- How to build a reactive filter bar where each control updates the query
  independently
- How to debounce a text input so the backend is not called on every keystroke
- How to omit empty filter parameters from the query string
- How `linkedSignal` resets pagination when any filter changes
- How to handle `409` (product modified elsewhere) in a dialog

---

## Filter controls

| Control | Type | Trigger | Sends as |
|---|---|---|---|
| Category | Select | On change | `categoryId` |
| Product name | Text input | Debounced 300ms | `productName` |
| Min price | Number input | On blur | `minPrice` |
| Max price | Number input | On blur | `maxPrice` |

The name filter debounces so the backend is not called on every keystroke. Price
filters apply on blur because users expect to type the whole number before the list
updates.

Any change to any filter resets the page to 0:

```typescript
// linkedSignal: when filters change, reset the page
page = linkedSignal({
  source: () => [this.categoryId(), this.productName(), this.minPrice(), this.maxPrice()],
  computation: () => 0,
});
```

---

## Omitting empty filters

Never send an empty string or null as a query parameter. Use the conditional spread
pattern to build the params object:

```typescript
const params = {
  page: this.page(),
  size: this.size(),
  ...(this.categoryId()  ? { categoryId:   this.categoryId()  } : {}),
  ...(this.productName() ? { productName:  this.productName() } : {}),
  ...(this.minPrice() != null ? { minPrice: this.minPrice()   } : {}),
  ...(this.maxPrice() != null ? { maxPrice: this.maxPrice()   } : {}),
};
```

An absent parameter and an empty-string parameter have different meanings on the
backend. The backend interprets `productName=` (empty string) as a filter that
matches no products, not as "no filter". Always omit keys with no value.

---

## Category select in the product dialog

The product create/edit dialog needs a list of categories to populate the select.
It calls `CategoriesService.getCategories()` with a large `size` (e.g. 100) to
load all categories at once. This avoids pagination in the select, which would be
awkward in a dialog. The categories service is already in scope (it was introduced
in the categories branch) so there is no new service to create.

---

## 409 on update (optimistic lock)

`PUT /api/v1/products/{id}` can return `409` when another request modified the
product between the moment the edit dialog was opened and the moment Save was
clicked. The dialog:

1. Shows the backend message inline (not a snackbar, not a redirect).
2. Keeps the dialog open.
3. Shows a "Reload product" button that calls `GET /api/v1/products/{id}` and
   refreshes the form with the latest values.

```typescript
error: (err: AppError) => {
  if (err.kind === 'CONFLICT') {
    this.formError.set(err.message);
    this.showReload.set(true);
  }
}
```

---

## Key files

| File | Purpose |
|---|---|
| `features/products/products.ts` | HttpClient wrapper for /products |
| `features/products/models/` | ProductRequest, ProductResponse |
| `features/products/pages/product-list/product-list.page.ts` | Filtered paginated list |
| `features/products/dialogs/product-form/product-form.dialog.ts` | Create/edit with 409 handling |
