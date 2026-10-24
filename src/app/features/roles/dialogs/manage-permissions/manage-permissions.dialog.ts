import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';

import { Roles } from '../../roles';
import { Permissions } from '../../../permissions/permissions';
import { RoleResponse, PermissionResponse } from '../../../auth/models/user-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';

/** Data passed to the dialog via MAT_DIALOG_DATA. */
export interface ManagePermissionsDialogData {
  /** Role whose permissions to manage. */
  role: RoleResponse;
}

/**
 * Dialog for assigning or removing permissions from a role.
 *
 * On open it loads all permissions from the backend, subtracts those already
 * on the role, and shows the remainder in an "Add permission" select. Each
 * removal chip calls DELETE /{roleId}/permissions/{permissionId} and updates
 * the role state from the returned RoleResponse.
 *
 * When the dialog is closed via the Close button, afterClosed() emits the
 * final RoleResponse so the parent page can update its table row.
 */
@Component({
  selector: 'app-manage-permissions-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogModule,
    MatChipsModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './manage-permissions.dialog.html',
  styleUrl: './manage-permissions.dialog.scss',
})
export class ManagePermissionsDialog implements OnInit {
  private readonly rolesService = inject(Roles);
  private readonly permissionsService = inject(Permissions);
  private readonly notification = inject(NotificationService);
  protected readonly data =
    inject<ManagePermissionsDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ManagePermissionsDialog, RoleResponse>>(MatDialogRef);

  /** Current state of the role (refreshed after each assign/remove). */
  protected readonly role = signal<RoleResponse>({ ...this.data.role });

  /** All permissions available in the system. */
  protected readonly allPermissions = signal<PermissionResponse[]>([]);

  /** Currently selected permission id in the add-select (ngModel). */
  protected selectedPermissionId: number | null = null;

  protected readonly loadingAll = signal(true);
  protected readonly saving = signal(false);

  /** @inheritdoc */
  ngOnInit(): void {
    this.permissionsService.getPermissions().subscribe({
      next: (list) => {
        this.allPermissions.set(list);
        this.loadingAll.set(false);
      },
      error: () => {
        this.loadingAll.set(false);
      },
    });
  }

  /**
   * Returns permissions not yet assigned to the current role.
   *
   * Used to populate the "Add permission" select so already-assigned
   * permissions are not shown as options.
   */
  protected get availablePermissions(): PermissionResponse[] {
    const assigned = new Set(this.role().permissions.map((p) => p.id));
    return this.allPermissions().filter((p) => !assigned.has(p.id));
  }

  /**
   * Assigns the selected permission to the role and refreshes from the server.
   */
  protected addPermission(): void {
    if (this.selectedPermissionId === null) return;

    this.saving.set(true);

    this.rolesService
      .addPermission(this.role().id, this.selectedPermissionId)
      .subscribe({
        next: (updated) => {
          this.role.set(updated);
          this.selectedPermissionId = null;
          this.saving.set(false);
        },
        error: (err: AppError) => {
          this.saving.set(false);
          this.notification.error(err.message);
        },
      });
  }

  /**
   * Removes a permission from the role and refreshes from the server.
   *
   * @param permission - the permission chip that was removed
   */
  protected removePermission(permission: PermissionResponse): void {
    this.saving.set(true);

    this.rolesService
      .removePermission(this.role().id, permission.id)
      .subscribe({
        next: (updated) => {
          this.role.set(updated);
          this.saving.set(false);
        },
        error: (err: AppError) => {
          this.saving.set(false);
          this.notification.error(err.message);
        },
      });
  }

  /**
   * Closes the dialog and emits the final role state to the parent page.
   */
  protected close(): void {
    this.dialogRef.close(this.role());
  }
}
