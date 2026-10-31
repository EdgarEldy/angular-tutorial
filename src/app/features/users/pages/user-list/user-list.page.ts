import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header';
import { LoadingComponent } from '../../../../shared/ui/loading/loading';
import { ErrorBannerComponent } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state';

import { Users } from '../../users';
import { UserResponse } from '../../../auth/models/user-response.model';
import { Auth } from '../../../../core/auth/auth';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';
import { EditUserDialog, EditUserDialogData } from '../../dialogs/edit-user/edit-user.dialog';
import { ManageRolesDialog } from '../../dialogs/manage-roles/manage-roles.dialog';
import { ConfirmDialogComponent } from '../../../../shared/ui/confirm-dialog/confirm-dialog';

/**
 * Administration page for managing user accounts.
 *
 * Shows a paginated table of users (username, email, status flags). Each row
 * offers edit (username/email), manage roles, lock/unlock, and delete actions.
 *
 * Own-account protection: an admin cannot lock or delete their own account.
 * The lock/delete buttons are disabled on the row whose email matches the
 * currently-authenticated user's email. The backend enforces the same rule
 * and returns 422 on a self-lock attempt.
 *
 * A 422 on delete is impossible (no constraint) but lock can return 422.
 * In both cases the snackbar shows the backend message and the row stays.
 */
@Component({
  selector: 'app-user-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    PageHeaderComponent,
    LoadingComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './user-list.page.html',
  styleUrl: './user-list.page.scss',
})
export class UserListPage implements OnInit {
  private readonly usersService = inject(Users);
  private readonly auth = inject(Auth);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly users = signal<UserResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);

  protected readonly displayedColumns = [
    'username', 'email', 'status', 'actions',
  ];

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadUsers();
  }

  /**
   * Returns the email of the currently-authenticated user, used to
   * disable own-account actions in the template.
   */
  protected get currentUserEmail(): string {
    return this.auth.currentUser()?.email ?? '';
  }

  /**
   * Loads one page of users from the backend.
   */
  protected loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersService.getUsers(this.page(), this.pageSize()).subscribe({
      next: (page) => {
        this.users.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Handles paginator page changes.
   *
   * @param event - MatPaginator PageEvent with new page index and size
   */
  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadUsers();
  }

  /**
   * Opens the edit dialog. Replaces the user row on success.
   *
   * @param user - user to edit
   */
  protected openEditDialog(user: UserResponse): void {
    const data: EditUserDialogData = { user };
    const ref = this.dialog.open(EditUserDialog, { data });
    ref.afterClosed().subscribe((updated: UserResponse | undefined) => {
      if (updated) {
        this.users.update((list) =>
          list.map((u) => (u.id === updated.id ? updated : u)),
        );
      }
    });
  }

  /**
   * Opens the manage-roles dialog. Refreshes the user row on close.
   *
   * @param user - user whose roles to manage
   */
  protected openManageRoles(user: UserResponse): void {
    const ref = this.dialog.open(ManageRolesDialog, { data: { user } });
    ref.afterClosed().subscribe((updated: UserResponse | undefined) => {
      if (updated) {
        this.users.update((list) =>
          list.map((u) => (u.id === updated.id ? updated : u)),
        );
      }
    });
  }

  /**
   * Locks a user account after confirmation.
   *
   * Disabled for the admin's own row. A 422 means the admin tried to lock
   * themselves (backend check); the snackbar shows the message.
   *
   * @param user - user to lock
   */
  protected lockUser(user: UserResponse): void {
    this.usersService.lockUser(user.id).subscribe({
      // Update the row from the server-authoritative UserResponse
      next: (updated) => {
        this.users.update((list) =>
          list.map((u) => (u.id === updated.id ? updated : u)),
        );
        this.notification.success('Account locked.');
      },
      error: (err: AppError) => {
        this.notification.error(err.message);
      },
    });
  }

  /**
   * Unlocks a previously-locked user account.
   *
   * @param user - user to unlock
   */
  protected unlockUser(user: UserResponse): void {
    this.usersService.unlockUser(user.id).subscribe({
      // Update the row from the server-authoritative UserResponse
      next: (updated) => {
        this.users.update((list) =>
          list.map((u) => (u.id === updated.id ? updated : u)),
        );
        this.notification.success('Account unlocked.');
      },
      error: (err: AppError) => {
        this.notification.error(err.message);
      },
    });
  }

  /**
   * Confirms then deletes a user account.
   *
   * Disabled for the admin's own row.
   *
   * @param user - user to delete
   */
  protected deleteUser(user: UserResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete user',
        message: `Delete ${user.username} (${user.email})? This cannot be undone.`,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.usersService.deleteUser(user.id).subscribe({
        next: () => {
          this.users.update((list) => list.filter((u) => u.id !== user.id));
          this.notification.success('User deleted.');
        },
        error: (err: AppError) => {
          this.notification.error(err.message);
        },
      });
    });
  }
}
