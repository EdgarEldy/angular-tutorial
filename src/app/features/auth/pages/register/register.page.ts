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
import { RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Auth } from '../../../../core/auth/auth';
import { AppError } from '../../../../core/http/app-error.model';

/**
 * Cross-field validator that checks whether the 'password' and 'confirmPassword'
 * controls in a FormGroup have the same value.
 *
 * Applied at the group level (not on an individual control) so it has access
 * to both sibling controls. The error is placed on the confirmPassword control
 * so the template can show it next to the relevant field.
 *
 * @returns ValidatorFn for use with FormBuilder.group({ validators: [passwordsMatch] })
 */
export const passwordsMatch: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const password: string | null | undefined = group.get('password')?.value;
  const confirm: string | null | undefined = group.get('confirmPassword')?.value;
  if (password && confirm && password !== confirm) {
    group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
};

/**
 * Registration page: collects username, email, and password, then calls
 * Auth.register(). On success it shows a confirmation message instead of
 * navigating, because the account must be activated via email before login.
 *
 * A 400 response maps field errors from the backend onto the corresponding
 * form controls so the user can see exactly which field failed validation.
 */
@Component({
  selector: 'app-register-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
})
export class RegisterPage {
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly serverError = signal<string | null>(null);

  /** Toggles visibility for the password field. */
  protected readonly showPassword = signal(false);

  /** Toggles visibility for the confirm-password field. */
  protected readonly showConfirmPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
    },
    { validators: [passwordsMatch] },
  );

  /**
   * Submits the registration form.
   *
   * On 400: maps fieldErrors from AppError onto the corresponding controls.
   * On success: shows a confirmation message and does not navigate.
   *
   * @param payload - form values minus confirmPassword (which is UI-only)
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverError.set(null);

    const { username, email, password } = this.form.getRawValue();

    this.auth.register({ username, email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set(
          'Registration successful! Check your email to activate your account.',
        );
      },
      error: (err: AppError) => {
        this.loading.set(false);

        if (err.kind === 'VALIDATION' && err.fieldErrors) {
          // Map server field errors onto the reactive form controls
          for (const [field, message] of Object.entries(err.fieldErrors)) {
            const control = this.form.get(field);
            if (control) {
              // setErrors merges with existing validators; the template reads
              // control.hasError('serverError') to show backend messages
              control.setErrors({ serverError: message });
            }
          }
        } else {
          this.serverError.set(err.message);
        }
      },
    });
  }
}
