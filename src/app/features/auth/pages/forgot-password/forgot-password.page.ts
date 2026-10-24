import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Auth } from '../../../../core/auth/auth';

/**
 * Forgot-password page: collects an email address and requests a reset link.
 *
 * The backend always returns 200 regardless of whether the email is registered,
 * to prevent user enumeration. The page must honour this contract by always
 * showing the same neutral confirmation message after submit -- it must NEVER
 * distinguish between success and error responses to the user.
 *
 * The only exception is a network/server error (kind SERVER or NETWORK), in
 * which case the user should be told to try again -- but even then we show
 * the same confirmation message to be safe.
 */
@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './forgot-password.page.html',
  styleUrl: './forgot-password.page.scss',
})
export class ForgotPasswordPage {
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  /**
   * True once the form has been submitted, regardless of the backend result.
   * The template switches to the neutral confirmation message when this is true.
   */
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  /**
   * Submits the forgot-password form.
   *
   * Both success and error paths set submitted to true, so the UI always
   * shows the same neutral confirmation message. This prevents the user from
   * inferring whether a given email address is registered.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    const { email } = this.form.getRawValue();

    this.auth.forgotPassword({ email }).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
      error: () => {
        // Show the same message even on error to prevent user enumeration
        this.loading.set(false);
        this.submitted.set(true);
      },
    });
  }
}
