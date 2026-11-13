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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Users } from '../../users';
import { Roles } from '../../../roles/roles';
import { UserResponse, RoleResponse } from '../../../auth/models/user-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';

/** Data passed to the dialog via MAT_DIALOG_DATA. */
export interface ManageRolesDialogData {
  /** User whose roles to manage. */
  user: UserResponse;
}

/**
 * Dialog for assigning or removing roles from a user.
 *
 * On open it fetches GET /users/{id} to load the full role set (the list
 * endpoint returns users with empty roles arrays) and GET /roles for the
 * complete list of available roles. It pre-checks the roles currently on
 * the user and loads the full list in parallel to avoid a sequential wait.
 *
 * On submit it diffs the initial checked set against the final one and
 * calls PATCH /users/{id}/roles once with { add, remove }. The diff
 * approach means a concurrent administrator's change to an unrelated role
 * is not overwritten.
 *
 * On success the dialog closes and emits the updated UserResponse. On a
 * BUSINESS_RULE error (422) it stays open and shows the backend message
 * inline; all other errors go to the global notification service.
 */
@Component({
  selector: 'app-manage-roles-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressSpinnerModule,
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

  /** User state; replaced when the detail call returns. */
  protected readonly user = signal<UserResponse>({ ...this.data.user, roles: [] });

  /** All roles in the system (for the checkbox list). */
  protected readonly allRoles = signal<RoleResponse[]>([]);

  /**
   * Set of role ids currently checked.
   *
   * Signals holding mutable objects must be replaced, not mutated, so Angular
   * detects the change and schedules a re-render.
   */
  protected readonly checkedIds = signal(new Set<number>());

  protected readonly loadingDetail = signal(true);
  protected readonly saving = signal(false);

  /** Non-null when a 422 response keeps the dialog open with a message. */
  protected readonly businessError = signal<string | null>(null);

  /** Snapshot of the initially-assigned role ids; used to compute the diff. */
  private initialIds = new Set<number>();

  /** @inheritdoc */
  ngOnInit(): void {
    // Load user detail and all roles in parallel
    this.usersService.getUser(this.data.user.id).subscribe({
      next: (u) => {
        this.user.set(u);
        const assigned = new Set(u.roles.map((r) => r.id));
        this.initialIds = new Set(assigned);
        // Replace the signal value -- never mutate a Set held in a signal
        this.checkedIds.set(assigned);
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
   * Returns true when the given role id is currently checked.
   *
   * @param id - role id to check
   * @returns whether the checkbox is checked
   */
  protected isChecked(id: number): boolean {
    return this.checkedIds().has(id);
  }

  /**
   * Toggles a role's checked state.
   *
   * Creates a new Set so the signal detects the change.
   *
   * @param id - role id to toggle
   */
  protected toggle(id: number): void {
    const next = new Set(this.checkedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.checkedIds.set(next);
    // Clear any previous business error when the user changes their selection
    this.businessError.set(null);
  }

  /**
   * Diffs initial vs final selection and calls PATCH /users/{id}/roles.
   *
   * If nothing changed, closes immediately without a network call. On
   * BUSINESS_RULE the dialog stays open and shows the backend message.
   */
  protected save(): void {
    const initial = this.initialIds;
    const current = this.checkedIds();
    const add = [...current].filter((id) => !initial.has(id));
    const remove = [...initial].filter((id) => !current.has(id));

    // No change: close without a server call
    if (!add.length && !remove.length) {
      this.dialogRef.close(this.user());
      return;
    }

    this.saving.set(true);
    this.usersService.updateRoles(this.user().id, { add, remove }).subscribe({
      next: (updated) => {
        this.dialogRef.close(updated);
      },
      error: (err: AppError) => {
        this.saving.set(false);
        if (err.kind === 'BUSINESS_RULE') {
          // Keep dialog open: show the backend message inline
          this.businessError.set(err.message);
        } else {
          this.notification.error(err.message);
        }
      },
    });
  }

  /**
   * Closes the dialog without saving, emitting the original user state.
   */
  protected cancel(): void {
    this.dialogRef.close(this.user());
  }
}
