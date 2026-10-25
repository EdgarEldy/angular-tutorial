import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Permissions } from '../../permissions';
import { PermissionResponse } from '../../../auth/models/user-response.model';
import { AppError } from '../../../../core/http/app-error.model';

/**
 * Dialog for creating a new permission.
 *
 * Collects a resource and an action as free-text fields. The convention
 * (UPPERCASE for both, e.g. PRODUCT + READ) is shown as a hint but not
 * enforced by the client -- the backend stores the value as-is.
 *
 * On success the dialog closes with the newly created PermissionResponse so
 * the parent page can append it to the table without a re-fetch.
 * On a 422 BUSINESS_RULE error, the message is shown inline and the dialog
 * stays open.
 */
@Component({
  selector: 'app-permission-form-dialog',
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
  templateUrl: './permission-form.dialog.html',
  styleUrl: './permission-form.dialog.scss',
})
export class PermissionFormDialog {
  private readonly permissionsService = inject(Permissions);
  private readonly dialogRef =
    inject<MatDialogRef<PermissionFormDialog, PermissionResponse>>(MatDialogRef);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    resource: ['', Validators.required],
    action: ['', Validators.required],
  });

  /**
   * Submits the form to POST /api/permissions.
   *
   * On success: closes the dialog with the created PermissionResponse.
   * On VALIDATION (400): maps fieldErrors onto form controls.
   * On BUSINESS_RULE (422): shows backend message inline.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set(null);

    const { resource, action } = this.form.getRawValue();

    this.permissionsService.createPermission({ resource, action }).subscribe({
      next: (created) => {
        this.dialogRef.close(created);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        if (err.kind === 'VALIDATION' && err.fieldErrors) {
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
