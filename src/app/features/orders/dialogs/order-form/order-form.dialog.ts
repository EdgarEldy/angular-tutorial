import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Orders } from '../../orders';
import { Customers } from '../../../customers/customers';
import { Products } from '../../../products/products';
import { OrderResponse } from '../../../customers/models/order-response.model';
import { CustomerResponse } from '../../../customers/models/customer-response.model';
import { ProductResponse } from '../../../products/models/product-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { MoneyPipe } from '../../../../shared/pipes/money-pipe';

/**
 * Data passed via MAT_DIALOG_DATA when editing an existing order.
 * Omitted (null) when creating a new order.
 */
export interface OrderFormDialogData {
  /** Existing order to edit. Absent when creating. */
  order?: OrderResponse;
}

/**
 * Dialog for creating or editing an order.
 *
 * Opened from OrderListPage with no data for create, or with an existing
 * OrderResponse for edit. Fields: customer_id (select), product_id (select),
 * quantity (integer >= 1).
 *
 * TOTAL PREVIEW:
 *   The previewTotal computed signal derives from the form's product_id and
 *   quantity values. When a product is selected the signal looks up its
 *   unit_price from productOptions and multiplies by quantity. This preview
 *   is clearly labelled "Estimated total (server will confirm):" so the user
 *   understands it is an approximation. The backend is the authority; the
 *   dialog closes with the server's OrderResponse whose total is canonical.
 *
 * Error handling:
 *  - BUSINESS_RULE (422): server message shown in serverError signal; dialog
 *    stays open.
 *  - VALIDATION (400): fieldErrors mapped onto the matching form controls via
 *    setErrors({ serverError: message }) so the user sees them inline.
 *  - Other errors: serverError signal shown below the form.
 *
 * On success the dialog closes with the server's OrderResponse so the
 * parent list can update its data without an extra HTTP request. The server's
 * total is the only value displayed after saving -- never the preview.
 */
@Component({
  selector: 'app-order-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MoneyPipe,
  ],
  templateUrl: './order-form.dialog.html',
  styleUrl: './order-form.dialog.scss',
})
export class OrderFormDialog implements OnInit {
  private readonly ordersService = inject(Orders);
  private readonly customersService = inject(Customers);
  private readonly productsService = inject(Products);
  protected readonly dialogRef =
    inject<MatDialogRef<OrderFormDialog, OrderResponse>>(MatDialogRef);
  // MAT_DIALOG_DATA is null when no data is passed (create mode)
  protected readonly data = inject<OrderFormDialogData | null>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  // Select options loaded once on init
  protected readonly customerOptions = signal<CustomerResponse[]>([]);
  protected readonly productOptions = signal<ProductResponse[]>([]);

  /** True when editing an existing order; false when creating a new one. */
  protected readonly isEdit = !!this.data?.order;

  /**
   * Typed reactive form for order fields.
   *
   * fb.nonNullable ensures that form.reset() restores initial values.
   * customer_id and product_id are required integers; quantity is required
   * and must be >= 1 (Validators.min mirrors the backend constraint).
   */
  protected readonly form = this.fb.nonNullable.group({
    // Pre-fill with the existing order's ids when editing
    customer_id: [
      this.data?.order?.customer?.id ?? (null as unknown as number),
      Validators.required,
    ],
    product_id: [
      this.data?.order?.product?.id ?? (null as unknown as number),
      Validators.required,
    ],
    quantity: [
      this.data?.order?.quantity ?? 1,
      [Validators.required, Validators.min(1)],
    ],
  });

  /**
   * Preview total computed from the form's current product and quantity.
   *
   * computed() re-evaluates whenever the form value changes. This works
   * because formValueSignal is a signal that we update manually via an
   * effect-like approach -- actually we use a dedicated signal updated by
   * the form's valueChanges.
   *
   * The preview is purely informational; the canonical total comes from the
   * server's response. Displayed in the template as "Estimated total".
   */
  protected readonly formValues = signal<{
    product_id: number | null;
    quantity: number;
  }>({
    product_id: this.data?.order?.product?.id ?? null,
    quantity: this.data?.order?.quantity ?? 1,
  });

  /**
   * Derived total preview: unit_price of the selected product * quantity.
   *
   * Returns null when no product is selected so the template can hide it.
   * Uses computed() so Angular's signal graph automatically re-runs this
   * when formValues or productOptions changes, with no subscription needed.
   */
  protected readonly previewTotal = computed<number | null>(() => {
    const vals = this.formValues();
    const pid = vals.product_id;
    if (pid === null) return null;
    const product = this.productOptions().find((p) => p.id === pid);
    if (!product) return null;
    const qty = vals.quantity;
    // Guard against non-positive quantities to avoid a negative or zero preview
    if (!qty || qty < 1) return null;
    // Arithmetic on money is allowed here because this is a preview only;
    // the server recomputes the authoritative total on save.
    return product.unit_price * qty;
  });

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadSelectOptions();

    // Sync form value changes into the formValues signal so computed() can
    // derive the preview total reactively without RxJS subscriptions.
    // The form is always non-null here because fb.nonNullable is used.
    this.form.valueChanges.subscribe((vals) => {
      this.formValues.set({
        product_id: vals.product_id ?? null,
        quantity: vals.quantity ?? 1,
      });
    });
  }

  /**
   * Loads customer and product lists for the select fields.
   *
   * A large size=100 approximates a full list without infinite scroll.
   * Both calls are required before the form is usable for create mode.
   * In edit mode the form pre-fills from the existing order's ids, so the
   * selects render the correct name as soon as the options arrive.
   */
  private loadSelectOptions(): void {
    this.customersService.getCustomers(0, 100).subscribe({
      next: (page) => this.customerOptions.set(page.content),
      error: () => undefined, // silently ignore -- user sees empty select
    });
    this.productsService.getProducts(0, 100).subscribe({
      next: (page) => this.productOptions.set(page.content),
      error: () => undefined,
    });
  }

  /**
   * Submits the form by calling createOrder (POST) or updateOrder (PUT).
   *
   * Disables the button (saving signal) while the request is in flight.
   * On success, closes the dialog with the server's OrderResponse. The
   * parent list displays order.total from this response -- never the preview.
   *
   * On BUSINESS_RULE (422): the backend message is shown in serverError;
   * the dialog stays open.
   * On VALIDATION (400): field errors are mapped onto form controls.
   * On other errors: message shown in serverError.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.serverError.set(null);

    const { customer_id, product_id, quantity } = this.form.getRawValue();

    const existingId = this.data?.order?.id;

    // Choose POST (create) or PUT (update) based on whether an id was passed
    const op$ =
      this.isEdit && existingId !== undefined
        ? this.ordersService.updateOrder(existingId, {
            customer_id,
            product_id,
            quantity,
          })
        : this.ordersService.createOrder({
            customer_id,
            product_id,
            quantity,
          });

    op$.subscribe({
      next: (result) => {
        // result.total is the server's authoritative value -- close with it
        this.dialogRef.close(result);
      },
      error: (err: AppError) => {
        this.saving.set(false);
        if (err.kind === 'BUSINESS_RULE') {
          this.serverError.set(err.message);
        } else if (err.kind === 'VALIDATION' && err.fieldErrors) {
          // Map backend field errors onto form controls so they appear inline
          for (const [field, message] of Object.entries(err.fieldErrors)) {
            const control: AbstractControl | null = this.form.get(field);
            if (control) {
              control.setErrors({ serverError: message });
            }
          }
        } else {
          this.serverError.set(err.message);
        }
      },
    });
  }

  /**
   * Returns the serverError string from a control's errors, or null.
   * Used in the template to show backend field errors inline.
   *
   * @param controlName - the name of the form control
   * @returns the server error message string or null
   */
  protected getServerError(controlName: string): string | null {
    const err: ValidationErrors | null | undefined =
      this.form.get(controlName)?.errors;
    if (err && typeof err['serverError'] === 'string') {
      return err['serverError'] as string;
    }
    return null;
  }
}
