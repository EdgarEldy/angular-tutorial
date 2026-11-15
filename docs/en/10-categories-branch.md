# Branch: feature/categories

Categories is the first full CRUD feature and the reference pattern that all
subsequent features copy. Study this branch before implementing products, customers
or orders.

---

## Learning objectives

After studying this branch you will understand:

- How to structure a feature folder (service, models, routes, pages, dialogs)
- How to wire a paginated list page with loading/error/empty states
- How a create/edit dialog pre-fills from existing data and handles errors inline
- How to use `*appHasRole` to conditionally show admin-only actions
- How to show `422` business rule errors inline in the dialog

---

## Screens

| Route | What it shows |
|---|---|
| `/categories` | Paginated table (category name, dates); public |
| `/categories/:id` | Detail page: category info and its products list; public |

Admin actions (New, Edit, Delete) are shown only to users with the ADMIN role, via
`*appHasRole="'ADMIN'"` on the respective buttons. The backend enforces the same
restriction; hiding the buttons is a UX improvement, not a security measure.

---

## List page states

The list page has three explicit signal states:

```typescript
loading  = signal(true);
error    = signal<AppError | null>(null);
items    = signal<CategoryResponse[]>([]);
total    = signal(0);
page     = signal(0);
size     = signal(10);
```

The initial `loading = signal(true)` means the spinner shows immediately on first
render, before the HTTP call returns.

---

## Create/edit dialog

The same dialog component (`CategoryFormDialog`) handles both create and edit.
`MAT_DIALOG_DATA` determines the mode:

```typescript
// In the dialog
const data = inject<CategoryResponse | null>(MAT_DIALOG_DATA);
// null -> create mode; CategoryResponse -> edit mode

this.form = new FormGroup({
  category_name: new FormControl(data?.category_name ?? '', {
    nonNullable: true,
    validators: [Validators.required],
  }),
});
```

On submit, the dialog calls either `createCategory()` or `updateCategory(id, ...)`.
On success, it calls `this.dialogRef.close(savedEntity)`. The list page listens for
the close event and reloads the list.

---

## 422 business rule: category with products

Deleting a category that still has products returns `422`. The UI shows the backend
message as a snackbar and keeps the row in the table:

```typescript
deleteCategory(id: number): void {
  this.categoriesService.deleteCategory(id).subscribe({
    next: () => this.loadCategories(),
    error: (err: AppError) => {
      // BUSINESS_RULE: "Cannot delete category with products"
      this.notification.error(err.message);
    },
  });
}
```

---

## Sharing categories with the products feature

The products feature needs a list of categories to populate the category select in
the product dialog. Rather than duplicating the HTTP call, the products feature
imports and calls `CategoriesService` directly. This avoids a second service
definition for the same data and keeps the category models in one place.

---

## Key files

| File | Purpose |
|---|---|
| `features/categories/categories.ts` | HttpClient wrapper for /categories |
| `features/categories/models/` | CategoryRequest, CategoryResponse |
| `features/categories/pages/category-list/category-list.page.ts` | Paginated list |
| `features/categories/pages/category-detail/category-detail.page.ts` | Detail |
| `features/categories/dialogs/category-form/category-form.dialog.ts` | Create/edit |
| `features/categories/categories.routes.ts` | Lazy routes for this feature |
