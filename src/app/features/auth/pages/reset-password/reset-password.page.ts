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
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Auth } from '../../../../core/auth/auth';
import { AppError } from '../../../../core/http/app-error.model';

/**
 * Cross-field validator that checks whether the 'new_password' and
 * 'confirmPassword' controls in a FormGroup have the same value.
 *
 * A local variant is used here rather than reusing the register page's
 * passwordsMatch because that one expects a 'password' control, while this
 * form uses 'new_password'. Sharing a parameterised factory would add
 * abstraction that is not warranted for two call sites.
 *
 * @returns ValidatorFn for use with FormBuilder.group({ validators: [newPasswordsMatch] })
 */
const newPasswordsMatch: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const newPwd: string | null | undefined = group.get('new_password')?.value;
  const confirm: string | null | undefined = group.get('confirmPassword')?.value;
  if (newPwd && confirm && newPwd !== confirm) {
    group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
};

/**
 * Reset-password page: collects a new password and its confirmation, then
 * calls Auth.resetPassword() with the single-use token from the URL query
 * parameter.
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
    { validators: [newPasswordsMatch] },
  );

  /**
   * Submits the reset-password form.
   *
   * Reads the token from the URL query parameter at submit time so the page
   * does not need to hold it in component state across a re-render. The token
   * is passed as a query parameter to the backend (not in the body) per the
   * updated endpoint contract.
   *
   * confirm_password is forwarded to the backend so the server can validate
   * the match independently of the client-side validator.
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

    const { new_password, confirmPassword } = this.form.getRawValue();

    this.auth.resetPassword(token, { new_password, confirm_password: confirmPassword }).subscribe({
      next: () => {
        void this.router.navigate(['/auth/login']);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        this.pageError.set(err.message);
      },
    });
  }
}
