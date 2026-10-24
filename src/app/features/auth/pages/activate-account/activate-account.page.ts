import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { Auth } from '../../../../core/auth/auth';
import { AppError } from '../../../../core/http/app-error.model';

/**
 * Account activation page: reads the token from the URL query parameter and
 * calls Auth.activateAccount() immediately on component initialization.
 *
 * The page shows three states:
 * 1. Loading -- spinner while the HTTP call is in-flight
 * 2. Success -- confirmation with a link to the login page
 * 3. Error -- the backend message (token expired, already used, etc.)
 *
 * There is no user input on this page; the activation is fully automatic.
 * This is safe because the token is single-use and short-lived on the server.
 */
@Component({
  selector: 'app-activate-account-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './activate-account.page.html',
  styleUrl: './activate-account.page.scss',
})
export class ActivateAccountPage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly success = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Reads the activation token from the query string and triggers the
   * HTTP call. Using ngOnInit instead of a constructor ensures the route
   * snapshot is available and that the DOM is ready to receive state updates.
   */
  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.loading.set(false);
      this.errorMessage.set('Activation token is missing from the URL.');
      return;
    }

    this.auth.activateAccount(token).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
