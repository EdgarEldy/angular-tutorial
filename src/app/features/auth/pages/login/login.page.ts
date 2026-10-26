import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
  imports: [ReactiveFormsModule, RouterLink, MatProgressSpinnerModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  /** True while the login HTTP call is in-flight. */
  protected readonly loading = signal(false);

  /** Toggles the password input between type="password" and type="text". */
  protected readonly showPassword = signal(false);

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
   * Redirects already-authenticated users away from the login page.
   *
   * The root path redirects to /login via AUTH_ROUTES. If the user is already
   * authenticated they should never see the login form -- send them to the
   * returnUrl (set by authGuard) or fall back to /dashboard.
   */
  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
      void this.router.navigateByUrl(returnUrl);
    }
  }

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
