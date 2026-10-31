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
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';

import { Users } from '../../users';
import { Roles } from '../../../roles/roles';
import { UserResponse, RoleResponse } from '../../../auth/models/user-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';

/** Data passed to the dialog via MAT_DIALOG_DATA. */
export interface ManageRolesDialogData {
  /** User whose roles to manage. The list response has roles: [] so the
   *  dialog fetches GET /users/{id} on open to get the full role set. */
  user: UserResponse;
}

/**
 * Dialog for assigning or removing roles from a user.
 *
 * On open it fetches GET /users/{id} to get the full role set (the list
 * endpoint returns users with empty roles arrays). It also loads all roles
 * so the add-select can show unassigned ones.
 *
 * Both addRole() and removeRole() compute the new desired role ID set and
 * call PUT /users/{userId}/roles with that set via assignRoles(). The backend
 * replaces the user's roles atomically, avoiding ordering issues that arise
 * when adding and removing one at a time.
 *
 * Each role chip has an expandable section showing its permissions, so the
 * admin can see what a role grants before assigning or removing it.
 *
 * Closing the dialog emits the final UserResponse for the parent page to
 * refresh its row.
 */
@Component({
  selector: 'app-manage-roles-dialog',
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
    MatExpansionModule,
  ],
  templateUrl: './manage-roles.dialog.html',
  styleUrl: './manage-roles.dialog.scss',
})
export class ManageRolesDialog implements OnInit {
  private readonly usersService = inject(Users);
  private readonly rolesService = inject(Roles);
  private readonly notification = inject(NotificationService);
  protected readonly data = inject<ManageRolesDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ManageRolesDialog, UserResponse>>(MatDialogRef);

  /** User state, updated after each role assign/remove. */
  protected readonly user = signal<UserResponse>({ ...this.data.user, roles: [] });

  /** All roles in the system (for the add-select). */
  protected readonly allRoles = signal<RoleResponse[]>([]);

  /** Currently selected role id in the add-select. */
  protected selectedRoleId: number | null = null;

  protected readonly loadingDetail = signal(true);
  protected readonly saving = signal(false);

  /** @inheritdoc */
  ngOnInit(): void {
    // Load full user detail (roles populated) and all roles in parallel
    this.usersService.getUser(this.data.user.id).subscribe({
      next: (u) => {
        this.user.set(u);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.loadingDetail.set(false);
      },
    });

    this.rolesService.getRoles().subscribe({
      next: (list) => this.allRoles.set(list),
    });
  }

  /**
   * Returns roles not yet assigned to the user.
   */
  protected get availableRoles(): RoleResponse[] {
    const assigned = new Set(this.user().roles.map((r) => r.id));
    return this.allRoles().filter((r) => !assigned.has(r.id));
  }

  /**
   * Adds the selected role to the user's current role set.
   *
   * Builds the new role ID list by appending selectedRoleId to the current
   * assigned set, then calls assignRoles() to replace them atomically.
   */
  protected addRole(): void {
    if (this.selectedRoleId === null) return;

    this.saving.set(true);

    // Build new role ID set: current roles + selected role
    const newIds = [...this.user().roles.map((r) => r.id), this.selectedRoleId];

    this.usersService.assignRoles(this.user().id, newIds).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.selectedRoleId = null;
        this.saving.set(false);
      },
      error: (err: AppError) => {
        this.saving.set(false);
        this.notification.error(err.message);
      },
    });
  }

  /**
   * Removes a role from the user's current role set.
   *
   * Builds the new role ID list by excluding the removed role's id, then
   * calls assignRoles() to replace the set atomically.
   *
   * @param role - the role to remove
   */
  protected removeRole(role: RoleResponse): void {
    this.saving.set(true);

    // Build new role ID set: current roles minus the removed role
    const newIds = this.user().roles.filter((r) => r.id !== role.id).map((r) => r.id);

    this.usersService.assignRoles(this.user().id, newIds).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.saving.set(false);
      },
      error: (err: AppError) => {
        this.saving.set(false);
        this.notification.error(err.message);
      },
    });
  }

  /**
   * Closes the dialog and emits the final user state.
   */
  protected close(): void {
    this.dialogRef.close(this.user());
  }
}
