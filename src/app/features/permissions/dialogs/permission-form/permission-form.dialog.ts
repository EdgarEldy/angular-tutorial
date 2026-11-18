import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';

import { Permissions } from '../../permissions';
import { PermissionResponse } from '../../../auth/models/user-response.model';
import { AppError } from '../../../../core/http/app-error.model';

/**
 * Predefined actions offered as checkboxes.
 *
 * Keeping them here rather than fetching from the backend keeps the
 * dialog synchronous and avoids an extra round trip. If the backend ever
 * introduces new actions, this array is the only place to update.
 */
const ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE'] as const;
type Action = (typeof ACTIONS)[number];

/**
 * Dialog for creating one or more permissions for a given resource.
 *
 * The user types a resource name (e.g. CATEGORY) and checks one or more
 * predefined actions (CREATE, READ, UPDATE, DELETE). On submit, one
 * POST /api/permissions call is made per selected action in parallel via
 * forkJoin. The dialog closes with the full array of created
 * PermissionResponse objects so the parent page can append them all at
 * once without a re-fetch.
 *
 * On a 422 BUSINESS_RULE error (e.g. duplicate permission), the message
 * is shown inline and the dialog stays open.
 */
@Component({
  selector: 'app-permission-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './permission-form.dialog.html',
  styleUrl: './permission-form.dialog.scss',
})
export class PermissionFormDialog {
  private readonly permissionsService = inject(Permissions);
  private readonly dialogRef =
    inject<MatDialogRef<PermissionFormDialog, PermissionResponse[]>>(MatDialogRef);
  private readonly fb = inject(FormBuilder);

  /** Predefined actions exposed to the template for @for iteration. */
  protected readonly ACTIONS = ACTIONS;

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  /**
   * Tracks which actions are currently checked.
   *
   * A Set is used instead of a plain boolean[] so that toggling by action
   * name requires no index bookkeeping and the has() check in isSelected()
   * is O(1).
   */
  protected readonly selectedActions = signal(new Set<Action>());

  /**
   * Set to true the first time the user clicks Create with no actions
   * checked, so the "Select at least one action" hint appears.
   */
  protected readonly showActionsError = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    resource: ['', Validators.required],
  });

  /**
   * Adds or removes an action from the selection set.
   *
   * The Set is treated as immutable: a new Set is created on every toggle
   * so that Angular's signal equality check detects the change.
   *
   * @param action - one of the predefined ACTIONS values
   */
  protected toggleAction(action: Action): void {
    this.selectedActions.update((set) => {
      // Spread into a new Set to trigger the signal update
      const next = new Set(set);
      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }
      return next;
    });
  }

  /**
   * Returns true if the given action is currently selected.
   *
   * @param action - action to check
   */
  protected isSelected(action: Action): boolean {
    return this.selectedActions().has(action);
  }

  /**
   * Submits the form by calling POST /api/permissions once per selected
   * action, running all calls in parallel with forkJoin.
   *
   * Guards:
   *  - form invalid (resource empty)   → shows validation state, returns
   *  - no actions selected             → shows inline hint, returns
   *
   * On success: closes the dialog with the array of created permissions.
   * On VALIDATION (400): maps fieldErrors onto the resource control.
   * On BUSINESS_RULE (422): shows backend message inline.
   */
  protected submit(): void {
    if (this.form.invalid) return;

    if (this.selectedActions().size === 0) {
      // Show the hint below the checkboxes on the first failed submit attempt
      this.showActionsError.set(true);
      return;
    }

    this.loading.set(true);
    this.serverError.set(null);

    const { resource } = this.form.getRawValue();

    // One observable per selected action; forkJoin runs them in parallel
    // and emits a single array once every call completes.
    const creates = Array.from(this.selectedActions()).map((action) =>
      this.permissionsService.createPermission({ resource, action }),
    );

    forkJoin(creates).subscribe({
      next: (created) => {
        this.dialogRef.close(created);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        if (err.kind === 'VALIDATION' && err.fieldErrors) {
          for (const [field, message] of Object.entries(err.fieldErrors)) {
            const control = this.form.get(field);
            if (control) {
              control.setErrors({ serverError: message });
            } else {
              // Field not in the form (e.g. action) -- show as a banner
              this.serverError.set(message);
            }
          }
        } else {
          this.serverError.set(err.message);
        }
      },
    });
  }
}
