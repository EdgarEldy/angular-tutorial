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

import { Users } from '../../users';
import { UserResponse } from '../../../auth/models/user-response.model';
import { AppError } from '../../../../core/http/app-error.model';

/** Data passed to EditUserDialog via MAT_DIALOG_DATA. */
export interface EditUserDialogData {
  /** User to edit. */
  user: UserResponse;
}

/**
 * Dialog for editing a user's username and/or email via PUT /api/v1/users/{id}.
 *
 * Pre-fills the form with the current username and email. On success the dialog
 * closes with the updated UserResponse so the parent page can refresh its row.
 * VALIDATION (400) field errors are mapped onto form controls.
 */
@Component({
  selector: 'app-edit-user-dialog',
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
  templateUrl: './edit-user.dialog.html',
  styleUrl: './edit-user.dialog.scss',
})
export class EditUserDialog {
  private readonly usersService = inject(Users);
  protected readonly data = inject<EditUserDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<EditUserDialog, UserResponse>>(MatDialogRef);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    username: [this.data.user.username, Validators.required],
    email: [this.data.user.email, [Validators.required, Validators.email]],
  });

  /**
   * Submits the form to PUT /api/v1/users/{id}.
   *
   * On success: closes with the updated user.
   * On VALIDATION (400): maps fieldErrors onto form controls.
   * On other errors: shows the message inline.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set(null);

    const { username, email } = this.form.getRawValue();

    this.usersService
      .updateUser(this.data.user.id, { username, email })
      .subscribe({
        next: (updated) => {
          this.dialogRef.close(updated);
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
