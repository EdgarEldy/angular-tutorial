import {
  ChangeDetectionStrategy,
  Component,
  inject,
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
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Customers } from '../../customers';
import { CustomerResponse } from '../../models/customer-response.model';
import { AppError } from '../../../../core/http/app-error.model';

/**
 * Data passed via MAT_DIALOG_DATA when editing an existing customer.
 * Omitted (null) when creating a new customer.
 */
export interface CustomerFormDialogData {
  /** Existing customer to edit. Absent when creating. */
  customer?: CustomerResponse;
}

/**
 * Telephone pattern from the API contract.
 * Required, matches ^\+?[0-9()\-\s]{7,20}$
 * This constant is exported so it can be reused in tests.
 */
export const TELEPHONE_PATTERN = /^\+?[0-9()\s\-]{7,20}$/;

/**
 * Dialog for creating or editing a customer.
 *
 * Opened from CustomerListPage with no data for create, or with a
 * CustomerResponse for edit. Fields: first_name, last_name, email,
 * telephone, address.
 *
 * Error handling:
 *  - BUSINESS_RULE (422): server message shown in serverError signal; dialog
 *    stays open. Typical case: duplicate email address.
 *  - VALIDATION (400): fieldErrors mapped onto the matching form controls via
 *    setErrors({ serverError: message }) so the user sees them inline.
 *  - Other errors: serverError signal shown below the form.
 *
 * On success the dialog closes with the server's CustomerResponse so the
 * parent list can update its data without an extra HTTP request.
 *
 * The submit button is disabled while the request is in flight (saving signal)
 * to prevent double-submit.
 */
@Component({
  selector: 'app-customer-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './customer-form.dialog.html',
  styleUrl: './customer-form.dialog.scss',
})
export class CustomerFormDialog {
  private readonly customersService = inject(Customers);
  protected readonly dialogRef =
    inject<MatDialogRef<CustomerFormDialog, CustomerResponse>>(MatDialogRef);
  // MAT_DIALOG_DATA is null when no data is passed (create mode)
  protected readonly data = inject<CustomerFormDialogData | null>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  /** True when editing an existing customer; false when creating a new one. */
  protected readonly isEdit = !!this.data?.customer;

  /**
   * Typed reactive form for customer fields.
   *
   * fb.nonNullable ensures that form.reset() restores initial values instead
   * of resetting everything to null. This matters when the server returns a
   * field error and the user corrects it -- the other fields should not be wiped.
   *
   * Validators.pattern mirrors the backend telephone rule exactly.
   */
  protected readonly form = this.fb.nonNullable.group({
    first_name: [
      this.data?.customer?.first_name ?? '',
      Validators.required,
    ],
    last_name: [
      this.data?.customer?.last_name ?? '',
      Validators.required,
    ],
    email: [
      this.data?.customer?.email ?? '',
      [Validators.required, Validators.email],
    ],
    telephone: [
      this.data?.customer?.telephone ?? '',
      // Validators.pattern mirrors the backend rule ^\+?[0-9()\-\s]{7,20}$
      [Validators.required, Validators.pattern(TELEPHONE_PATTERN)],
    ],
    address: [
      this.data?.customer?.address ?? '',
      Validators.required,
    ],
  });

  /**
   * Submits the form by calling createCustomer (POST) or updateCustomer (PUT).
   *
   * Disables the button (saving signal) while the request is in flight.
   * On success, closes the dialog with the server response.
   *
   * On BUSINESS_RULE (422): the backend message (e.g. duplicate email) is shown
   * in serverError. The dialog stays open so the user can correct the field.
   *
   * On VALIDATION (400): each fieldErrors entry is mapped to the matching form
   * control via setErrors({ serverError: message }) so the Angular Material
   * error display shows it inline below the relevant input.
   *
   * On other errors: message shown in serverError below the form.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.serverError.set(null);

    const { first_name, last_name, email, telephone, address } =
      this.form.getRawValue();

    const existingId = this.data?.customer?.id;

    // Choose POST (create) or PUT (update) based on whether an id exists
    const op$ =
      this.isEdit && existingId !== undefined
        ? this.customersService.updateCustomer(existingId, {
            first_name,
            last_name,
            email,
            telephone,
            address,
          })
        : this.customersService.createCustomer({
            first_name,
            last_name,
            email,
            telephone,
            address,
          });

    op$.subscribe({
      next: (result) => {
        this.dialogRef.close(result);
      },
      error: (err: AppError) => {
        this.saving.set(false);
        if (err.kind === 'BUSINESS_RULE') {
          // 422: domain rule violation -- duplicate email is the most common
          // case. Show the backend message and keep the dialog open.
          this.serverError.set(err.message);
        } else if (err.kind === 'VALIDATION' && err.fieldErrors) {
          // 400: map each field error to the corresponding form control.
          // The backend may use camelCase keys (e.g. firstName) or snake_case
          // (first_name) -- Angular's FormGroup.get() works with both because
          // our controls are already named in snake_case matching the API keys.
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
   * Used in the template to avoid repeating getError('serverError').
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
