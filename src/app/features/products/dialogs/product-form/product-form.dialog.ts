import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Products } from '../../products';
import { Categories } from '../../../categories/categories';
import { CategoryResponse } from '../../../categories/models/category-response.model';
import { ProductResponse } from '../../models/product-response.model';
import { AppError } from '../../../../core/http/app-error.model';

/**
 * Data passed via MAT_DIALOG_DATA when editing an existing product.
 * Omitted (null) when creating a new product.
 */
export interface ProductFormDialogData {
  /** Existing product to edit. Absent when creating. */
  product?: ProductResponse;
}

/**
 * Dialog for creating or editing a product.
 *
 * Opened from ProductListPage with no data for create, or with a
 * ProductResponse for edit. Fields: product_name, unit_price (> 0),
 * and category_id (select loaded from CategoriesService).
 *
 * Error handling:
 *  - VALIDATION (400): fieldErrors mapped onto form controls.
 *  - CONFLICT (409): product modified by another user since it was read.
 *    The dialog stays open, shows the server message, and exposes a
 *    conflictError signal that the template uses to show a "Reload"
 *    button -- the user can close and reopen the edit dialog to get
 *    the latest version.
 *  - BUSINESS_RULE (422) / other: serverError signal shown below the form.
 *
 * On success the dialog closes with the server's ProductResponse so the
 * parent page can update its list without an extra HTTP request.
 */
@Component({
  selector: 'app-product-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './product-form.dialog.html',
  styleUrl: './product-form.dialog.scss',
})
export class ProductFormDialog implements OnInit {
  private readonly productsService = inject(Products);
  private readonly categoriesService = inject(Categories);
  protected readonly dialogRef =
    inject<MatDialogRef<ProductFormDialog, ProductResponse>>(MatDialogRef);
  // MAT_DIALOG_DATA is null when no data is passed to the dialog
  protected readonly data = inject<ProductFormDialogData | null>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  // True when PUT returned 409: the dialog stays open and shows a reload hint
  protected readonly conflictError = signal(false);
  protected readonly categories = signal<CategoryResponse[]>([]);

  /** True when editing an existing product; false when creating. */
  protected readonly isEdit = !!this.data?.product;

  protected readonly form = this.fb.nonNullable.group({
    // Pre-fill with existing values when editing
    product_name: [
      this.data?.product?.product_name ?? '',
      Validators.required,
    ],
    // unit_price stored as a number; the HTML input is type="number".
    // Validators.min(0.01) mirrors the backend rule: unit_price must be > 0.
    unit_price: [
      this.data?.product?.unit_price ?? (null as unknown as number),
      [Validators.required, Validators.min(0.01)],
    ],
    // category_id is a required select; pre-fill with existing value or null
    category_id: [
      this.data?.product?.category_id ?? (null as unknown as number),
      Validators.required,
    ],
  });

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * Loads all categories for the select dropdown.
   * Uses a large page size to retrieve the whole list in one request.
   * This delegates to CategoriesService to avoid duplicating the HTTP call.
   */
  private loadCategories(): void {
    this.categoriesService.getCategories(0, 200).subscribe({
      next: (page) => this.categories.set(page.content),
      error: () => {
        // A failed category load is non-critical: the select will be empty
        // and the user cannot create/edit until categories load. We do not
        // propagate this error to serverError so the form stays usable.
      },
    });
  }

  /**
   * Submits the form by either creating (POST) or updating (PUT) the product.
   *
   * Disables the submit button (via saving signal) while the request is in
   * flight to prevent double-submit. On success the dialog closes with the
   * server response.
   *
   * CONFLICT (409): form stays open; conflictError becomes true so the
   * template can render a "Reload" button explaining the situation.
   * VALIDATION (400): fieldErrors are applied to matching controls.
   * Other errors: message is shown below the form.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.serverError.set(null);
    this.conflictError.set(false);

    const { product_name, unit_price, category_id } = this.form.getRawValue();
    const existingId = this.data?.product?.id;

    // Choose POST (create) or PUT (update) based on whether an id exists
    const op$ =
      this.isEdit && existingId !== undefined
        ? this.productsService.updateProduct(existingId, {
            product_name,
            unit_price,
            category_id,
          })
        : this.productsService.createProduct({
            product_name,
            unit_price,
            category_id,
          });

    op$.subscribe({
      next: (result) => {
        this.dialogRef.close(result);
      },
      error: (err: AppError) => {
        this.saving.set(false);
        if (err.kind === 'CONFLICT') {
          // 409: product was modified by another request since it was read.
          // Keep the dialog open, show the backend message, and offer a reload.
          this.serverError.set(
            err.message + ' Reload the product to see the latest version.',
          );
          this.conflictError.set(true);
        } else if (err.kind === 'VALIDATION' && err.fieldErrors) {
          // Map each server field error onto the corresponding form control
          for (const [field, message] of Object.entries(err.fieldErrors)) {
            this.form.get(field)?.setErrors({ serverError: message });
          }
        } else {
          this.serverError.set(err.message);
        }
      },
    });
  }
}
