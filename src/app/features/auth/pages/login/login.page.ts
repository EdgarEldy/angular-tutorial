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
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Auth } from '../../../../core/auth/auth';
import { AppError } from '../../../../core/http/app-error.model';

/**
 * Login page: collects email and password, calls Auth.login(), and navigates
 * to the returnUrl on success.
 *
 * Special error handling: a 401 from POST /auth/login is NOT handled by the
 * global UNAUTHENTICATED flow (which would redirect back to /login in a loop).
 * The login page intercepts it manually and displays the backend message
 * directly in the form. Every other error kind (network, server) is surfaced
 * via a formError signal so the template can display it inline.
 *
 * The returnUrl pattern allows guards to send unauthenticated users here and
 * have them land back on the page they tried to visit after a successful login.
 */
@Component({
  selector: 'app-login-page',
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
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  /** True while the login HTTP call is in-flight. */
  protected readonly loading = signal(false);

  /**
   * Generic error message shown below the form (network/server errors).
   * A 401 sets this with the backend message instead of redirecting.
   */
  protected readonly formError = signal<string | null>(null);

  /**
   * Typed reactive form for login.
   * FormBuilder.nonNullable ensures control values are never null,
   * removing the need for null-coalescing in the submit handler.
   */
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  /**
   * Submits the login form.
   *
   * On 401: shows the backend message in the form (not a redirect).
   * On other errors: sets formError for inline display.
   * On success: navigates to returnUrl or '/' (the shell dashboard).
   */
  protected submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.formError.set(null);

    const { email, password } = this.form.getRawValue();

    this.auth.login({ email, password }).subscribe({
      next: () => {
        // Load user profile then navigate; failure is handled inside loadCurrentUser
        this.auth.loadCurrentUser().subscribe();
        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        // 401 on the login endpoint means wrong credentials; show message inline
        this.formError.set(err.message);
      },
    });
  }
}
