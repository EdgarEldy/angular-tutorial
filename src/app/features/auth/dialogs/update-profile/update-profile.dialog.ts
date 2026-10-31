import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Auth } from '../../../../core/auth/auth';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';
import { UserResponse } from '../../models/user-response.model';

/** Data injected into the dialog from the parent component. */
export interface UpdateProfileDialogData {
  userId: number;
  username: string;
  email: string;
}

/**
 * Dialog for editing the current user's username and email.
 *
 * MAT_DIALOG_DATA is the Angular Material injection token that carries
 * the data object passed to dialog.open(). The dialog is closed with
 * MatDialogRef.close(result) where result is either the updated UserResponse
 * (on success) or undefined (on cancel).
 *
 * Both fields are optional in UpdateProfileRequest: the user can update just
 * one field and leave the other unchanged. The form pre-fills the current
 * values so the user sees what they are editing.
 *
 * A 400 response maps fieldErrors onto the form controls so the user can
 * see exactly which field the backend rejected. The dialog stays open on
 * validation errors (422) and on server errors so the user can correct
 * their input without losing the form state.
 */
@Component({
  selector: 'app-update-profile-dialog',
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
  templateUrl: './update-profile.dialog.html',
  styleUrl: './update-profile.dialog.scss',
})
export class UpdateProfileDialog {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UpdateProfileDialog>);
  protected readonly data = inject<UpdateProfileDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  // Both fields are optional per UpdateProfileRequest; no Validators.required
  protected readonly form = this.fb.group({
    username: [this.data.username],
    email: [this.data.email],
  });

  /**
   * Submits the profile update.
   *
   * On 400: maps fieldErrors onto the form controls and keeps the dialog open.
   * On success: closes the dialog with the updated UserResponse so the
   * profile page can update its user signal without a network round-trip.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set(null);

    const { username, email } = this.form.getRawValue();
    // Strip nulls: send only fields that have a value
    const payload: { username?: string; email?: string } = {};
    if (username) payload.username = username;
    if (email) payload.email = email;

    this.auth.updateProfile(this.data.userId, payload).subscribe({
      next: (updated: UserResponse) => {
        this.dialogRef.close(updated);
      },
      error: (err: AppError) => {
        this.loading.set(false);

        if (err.kind === 'UNAUTHENTICATED') {
          // Session expired mid-dialog; close before redirecting so the overlay
          // is not left open after navigation.
          this.dialogRef.close();
          this.auth.clearSession();
          void this.router.navigate(['/login'], { queryParams: { returnUrl: '/profile' } });
          return;
        }

        if (err.kind === 'FORBIDDEN') {
          this.notification.error(err.message);
          return;
        }

        if (err.kind === 'VALIDATION' && err.fieldErrors) {
          for (const [field, message] of Object.entries(err.fieldErrors)) {
            const control = this.form.get(field);
            if (control) {
              control.setErrors({ serverError: message });
            }
          }
          return;
        }

        this.serverError.set(err.message);
      },
    });
  }
}
