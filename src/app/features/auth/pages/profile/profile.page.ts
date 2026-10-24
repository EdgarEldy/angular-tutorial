import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { Auth } from '../../../../core/auth/auth';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';
import { UserResponse } from '../../models/user-response.model';

/**
 * Profile page: displays the current user's account details and provides
 * access to the UpdateProfileDialog.
 *
 * Account details (name, email, enabled/locked status) come from
 * GET /auth/me. Role and permission names shown in the "Access" section
 * come from the JWT claims stored in AuthService signals, NOT from the
 * /auth/me response. This ensures the displayed access information
 * matches what the backend actually enforces for the current session.
 *
 * The page implements three explicit states: loading, error (with retry),
 * and data.
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly user = signal<UserResponse | null>(null);

  /** Role names from JWT claims (not from /auth/me). */
  protected readonly roles = this.auth.roles;

  /** Permission strings from JWT claims (not from /auth/me). */
  protected readonly permissions = this.auth.permissions;

  ngOnInit(): void {
    this.loadProfile();
  }

  /**
   * Loads the user profile from GET /auth/me.
   * Can be called again via the error state retry button.
   *
   * Uses getProfile() (not loadCurrentUser()) because the profile page
   * needs errors to propagate so the error-state/retry UI can appear.
   * loadCurrentUser() swallows errors for the app initializer use case.
   */
  protected loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);

    this.auth.getProfile().subscribe({
      next: (u) => {
        this.user.set(u);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.loading.set(false);

        if (err.kind === 'UNAUTHENTICATED') {
          // Session expired while the user was on the profile page; clear local
          // state and redirect to login so they can re-authenticate.
          this.auth.clearSession();
          void this.router.navigate(['/login'], { queryParams: { returnUrl: '/profile' } });
          return;
        }

        if (err.kind === 'FORBIDDEN') {
          this.notification.error(err.message);
          return;
        }

        this.error.set(err);
      },
    });
  }

  /**
   * Opens the UpdateProfileDialog pre-populated with the current user's name.
   * On dialog close with a result, updates the user signal with the returned
   * UserResponse so the page reflects the change immediately without a reload.
   */
  protected openEditDialog(): void {
    const current = this.user();
    if (!current) return;

    // Lazy import avoids a circular dependency between the page and the dialog
    void import('../../dialogs/update-profile/update-profile.dialog').then(
      ({ UpdateProfileDialog }) => {
        const ref = this.dialog.open(UpdateProfileDialog, {
          data: {
            userId: current.id,
            firstName: current.first_name,
            lastName: current.last_name,
          },
          width: '400px',
        });

        ref.afterClosed().subscribe((updated: UserResponse | undefined) => {
          if (updated) {
            this.user.set(updated);
          }
        });
      },
    );
  }
}
