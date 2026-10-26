import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Auth } from '../../../../core/auth/auth';
import { AppError } from '../../../../core/http/app-error.model';
import { passwordsMatch } from '../register/register.page';

/**
 * Reset-password page: collects a new password, validates it, and calls
 * Auth.resetPassword() with the token from the URL query parameter.
 *
 * A 400 from this endpoint signals an invalid or expired token (not a
 * field-validation error), so it is shown as a plain error message on the
 * page rather than being mapped to a form control.
 *
 * On success the user is redirected to /login.
 */
@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.scss',
})
export class ResetPasswordPage {
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly pageError = signal<string | null>(null);

  /** Toggles visibility for the new-password field. */
  protected readonly showPassword = signal(false);

  /** Toggles visibility for the confirm-password field. */
  protected readonly showConfirmPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
    },
    { validators: [passwordsMatch] },
  );

  /**
   * Submits the reset-password form.
   *
   * Reads the token from the URL query parameter at submit time so the
   * page does not need to hold it in component state across a re-render.
   *
   * A 400 error means the token is invalid or expired; it is shown as a
   * page-level message rather than a form error.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.pageError.set('Reset token is missing. Please use the link from your email.');
      return;
    }

    this.loading.set(true);
    this.pageError.set(null);

    const { new_password } = this.form.getRawValue();

    this.auth.resetPassword({ token, new_password }).subscribe({
      next: () => {
        void this.router.navigate(['/login']);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        this.pageError.set(err.message);
      },
    });
  }
}
