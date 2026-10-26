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
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header';
import { LoadingComponent } from '../../../../shared/ui/loading/loading';
import { ErrorBannerComponent } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state';

import { Roles } from '../../roles';
import { RoleResponse } from '../../../auth/models/user-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';
import { RoleFormDialog, RoleFormDialogData } from '../../dialogs/role-form/role-form.dialog';
import { ManagePermissionsDialog } from '../../dialogs/manage-permissions/manage-permissions.dialog';
import { ConfirmDialogComponent } from '../../../../shared/ui/confirm-dialog/confirm-dialog';

/**
 * Administration page for managing roles.
 *
 * Lists all roles in a table. Each row shows the role name and its permissions
 * as chips. Admins can create, edit, or delete roles and open the
 * ManagePermissionsDialog to assign or remove permissions from a role.
 *
 * A 422 on delete means the role is still assigned to at least one user.
 * The snackbar shows that message and the row stays in the table.
 *
 * After ManagePermissionsDialog closes with an updated role, the table row
 * is refreshed from the returned RoleResponse so permissions chips stay current.
 */
@Component({
  selector: 'app-role-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    PageHeaderComponent,
    LoadingComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './role-list.page.html',
  styleUrl: './role-list.page.scss',
})
export class RoleListPage implements OnInit {
  private readonly rolesService = inject(Roles);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly roles = signal<RoleResponse[]>([]);

  protected readonly displayedColumns = ['role_name', 'permissions', 'actions'];

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadRoles();
  }

  /**
   * Loads all roles from the backend.
   */
  protected loadRoles(): void {
    this.loading.set(true);
    this.error.set(null);

    this.rolesService.getRoles().subscribe({
      next: (list) => {
        this.roles.set(list);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Opens the create dialog. Appends the new role to the list on success.
   */
  protected openCreateDialog(): void {
    const ref = this.dialog.open(RoleFormDialog);
    ref.afterClosed().subscribe((created: RoleResponse | undefined) => {
      if (created) {
        this.roles.update((list) => [...list, created]);
      }
    });
  }

  /**
   * Opens the edit dialog pre-filled with the existing role name.
   * Replaces the role in the list on success.
   *
   * @param role - the role to edit
   */
  protected openEditDialog(role: RoleResponse): void {
    const data: RoleFormDialogData = { role };
    const ref = this.dialog.open(RoleFormDialog, { data });
    ref.afterClosed().subscribe((updated: RoleResponse | undefined) => {
      if (updated) {
        this.roles.update((list) =>
          list.map((r) => (r.id === updated.id ? updated : r)),
        );
      }
    });
  }

  /**
   * Opens ManagePermissionsDialog. Refreshes the role's row from the
   * returned RoleResponse when the dialog closes.
   *
   * @param role - the role whose permissions to manage
   */
  protected openManagePermissions(role: RoleResponse): void {
    const ref = this.dialog.open(ManagePermissionsDialog, { data: { role } });
    ref.afterClosed().subscribe((updated: RoleResponse | undefined) => {
      if (updated) {
        this.roles.update((list) =>
          list.map((r) => (r.id === updated.id ? updated : r)),
        );
      }
    });
  }

  /**
   * Confirms then deletes a role. Shows the 422 message and keeps the row.
   *
   * @param role - the role to delete
   */
  protected deleteRole(role: RoleResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete role',
        message: `Delete role "${role.role_name}"? This cannot be undone.`,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.rolesService.deleteRole(role.id).subscribe({
        next: () => {
          this.roles.update((list) => list.filter((r) => r.id !== role.id));
          this.notification.success('Role deleted.');
        },
        error: (err: AppError) => {
          this.notification.error(err.message);
        },
      });
    });
  }
}
