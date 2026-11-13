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
 * On open it loads all permissions from the backend and pre-checks those
 * already on the role. On submit it diffs the initial checked set against
 * the final one and calls PATCH /roles/{roleId}/permissions once with
 * { add: newIds, remove: removedIds }. The diff approach means a concurrent
 * administrator's change to an unrelated permission is not overwritten.
 *
 * On success the dialog closes and emits the updated RoleResponse. On a
 * BUSINESS_RULE error (422) the dialog stays open and shows the backend
 * message; all other errors are forwarded to the global notification service.
 */
@Component({
  selector: 'app-manage-permissions-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule,
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

  /** Current role (kept to emit on cancel or on no-change save). */
  protected readonly role = signal<RoleResponse>({ ...this.data.role });

  /** All permissions available in the system. */
  protected readonly allPermissions = signal<PermissionResponse[]>([]);

  /**
   * Set of permission ids currently checked in the UI.
   *
   * Signals holding mutable objects (Set, Map) must be replaced -- not
   * mutated in place -- so Angular detects the change and re-renders.
   */
  protected readonly checkedIds = signal(new Set<number>());

  protected readonly loadingAll = signal(true);
  protected readonly saving = signal(false);

  /** Non-null when a 422 response keeps the dialog open with a message. */
  protected readonly businessError = signal<string | null>(null);

  /** Snapshot of assigned permission ids taken on load; used to compute the diff. */
  private initialIds = new Set<number>();

  /** @inheritdoc */
  ngOnInit(): void {
    this.permissionsService.getPermissions().subscribe({
      next: (list) => {
        this.allPermissions.set(list);
        // Pre-check permissions already assigned to this role
        const assigned = new Set(this.role().permissions.map((p) => p.id));
        this.initialIds = new Set(assigned);
        // Replace the signal value -- never mutate a Set held in a signal
        this.checkedIds.set(assigned);
        this.loadingAll.set(false);
      },
      error: () => {
        this.loadingAll.set(false);
      },
    });
  }

  /**
   * Returns true when the given permission id is currently checked.
   *
   * @param id - permission id to check
   * @returns whether the checkbox is checked
   */
  protected isChecked(id: number): boolean {
    return this.checkedIds().has(id);
  }

  /**
   * Toggles a permission's checked state.
   *
   * Creates a new Set so the signal detects the change.
   *
   * @param id - permission id to toggle
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
   * Diffs initial vs final selection and calls PATCH /roles/{id}/permissions.
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
      this.dialogRef.close(this.role());
      return;
    }

    this.saving.set(true);
    this.rolesService.updatePermissions(this.role().id, { add, remove }).subscribe({
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
   * Closes the dialog without saving, emitting the original role state.
   */
  protected cancel(): void {
    this.dialogRef.close(this.role());
  }
}
