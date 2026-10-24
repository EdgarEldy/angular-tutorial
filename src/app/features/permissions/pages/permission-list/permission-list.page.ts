import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Permissions } from '../../permissions';
import { PermissionResponse } from '../../../auth/models/user-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';
import { PermissionFormDialog } from '../../dialogs/permission-form/permission-form.dialog';
import { ConfirmDialogComponent } from '../../../../shared/ui/confirm-dialog/confirm-dialog';

/**
 * Administration page for managing permissions.
 *
 * Lists all permissions in a table (resource, action, combined RESOURCE:ACTION).
 * Admins can create new permissions via PermissionFormDialog and delete existing
 * ones. Deleting a permission that is still assigned to a role returns a 422
 * from the backend; the page surfaces that message and keeps the row.
 *
 * The page owns three explicit states: loading, error (with retry), and data.
 */
@Component({
  selector: 'app-permission-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './permission-list.page.html',
  styleUrl: './permission-list.page.scss',
})
export class PermissionListPage implements OnInit {
  private readonly permissionsService = inject(Permissions);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly permissions = signal<PermissionResponse[]>([]);

  /** Columns shown in the Material table. */
  protected readonly displayedColumns = ['resource', 'action', 'combined', 'actions'];

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadPermissions();
  }

  /**
   * Loads all permissions from the backend and populates the table.
   *
   * Resets the error state on each call so the retry button works.
   */
  protected loadPermissions(): void {
    this.loading.set(true);
    this.error.set(null);

    this.permissionsService.getPermissions().subscribe({
      next: (list) => {
        this.permissions.set(list);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Opens the create dialog and appends the returned permission to the list.
   *
   * afterClosed() emits the new PermissionResponse when the dialog confirms,
   * or undefined when the user cancels -- the undefined check avoids a spurious
   * table update.
   */
  protected openCreateDialog(): void {
    const ref = this.dialog.open(PermissionFormDialog);
    ref.afterClosed().subscribe((created: PermissionResponse | undefined) => {
      if (created) {
        // Append to local list without a round-trip fetch
        this.permissions.update((list) => [...list, created]);
      }
    });
  }

  /**
   * Asks for confirmation then deletes a permission.
   *
   * A 422 response means the permission is still assigned to at least one role.
   * The snackbar shows the backend message; the row stays in the table.
   *
   * @param permission - the permission to delete
   */
  protected deletePermission(permission: PermissionResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete permission',
        message: `Delete ${permission.resource}:${permission.action}? This cannot be undone.`,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.permissionsService.deletePermission(permission.id).subscribe({
        next: () => {
          // Remove the deleted row from the local list
          this.permissions.update((list) =>
            list.filter((p) => p.id !== permission.id),
          );
          this.notification.success('Permission deleted.');
        },
        error: (err: AppError) => {
          // 422: still assigned to a role -- show backend message, keep row
          this.notification.error(err.message);
        },
      });
    });
  }
}
