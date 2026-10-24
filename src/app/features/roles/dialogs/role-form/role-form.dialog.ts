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
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Roles } from '../../roles';
import { RoleResponse } from '../../../auth/models/user-response.model';
import { AppError } from '../../../../core/http/app-error.model';

/** Data passed via MAT_DIALOG_DATA when editing an existing role. */
export interface RoleFormDialogData {
  /** Existing role to edit. Omitted for a create operation. */
  role?: RoleResponse;
}

/**
 * Dialog for creating or editing a role.
 *
 * When opened with data.role, the form is pre-filled and a PUT is issued.
 * When opened without data, an empty form is shown and a POST is issued.
 *
 * The role name is free text; a hint reminds the user of the UPPERCASE
 * convention (e.g. ADMIN, MANAGER). On success the dialog closes with the
 * created or updated RoleResponse for the parent page to update its list.
 */
@Component({
  selector: 'app-role-form-dialog',
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
  templateUrl: './role-form.dialog.html',
  styleUrl: './role-form.dialog.scss',
})
export class RoleFormDialog {
  private readonly rolesService = inject(Roles);
  private readonly dialogRef =
    inject<MatDialogRef<RoleFormDialog, RoleResponse>>(MatDialogRef);
  // MAT_DIALOG_DATA is null when the dialog is opened without data
  protected readonly data = inject<RoleFormDialogData | null>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  /** True when editing an existing role; false when creating. */
  protected readonly isEdit = !!this.data?.role;

  protected readonly form = this.fb.nonNullable.group({
    // Pre-fill with existing name when editing
    role_name: [this.data?.role?.role_name ?? '', Validators.required],
  });

  /**
   * Submits the form.
   *
   * Creates the role (POST) or updates it (PUT) depending on whether
   * an existing role was passed to the dialog. On success the dialog closes
   * with the server's response so the parent page has the canonical state.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set(null);

    const { role_name } = this.form.getRawValue();
    // When isEdit is true, data and data.role are guaranteed by the caller
    const existingId = this.data?.role?.id;
    const op$ =
      this.isEdit && existingId !== undefined
        ? this.rolesService.updateRole(existingId, { role_name })
        : this.rolesService.createRole({ role_name });

    op$.subscribe({
      next: (result) => {
        this.dialogRef.close(result);
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
