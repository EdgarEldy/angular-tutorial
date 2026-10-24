import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

/** Data passed to the dialog via MAT_DIALOG_DATA. */
export interface ConfirmDialogData {
  /** Dialog title, e.g. "Delete product". */
  title: string;
  /** Body message, e.g. "Are you sure you want to delete Widget? This action cannot be undone." */
  message: string;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
}

/**
 * Generic confirmation dialog used for destructive actions.
 *
 * Open with MatDialog.open() and subscribe to afterClosed() to receive
 * true (confirmed) or undefined (cancelled).
 *
 * Usage:
 *   const ref = this.dialog.open(ConfirmDialogComponent, {
 *     data: { title: 'Delete product', message: 'This action cannot be undone.' }
 *   });
 *   ref.afterClosed().pipe(filter(Boolean)).subscribe(() => this.delete());
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialogComponent {
  protected data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<ConfirmDialogComponent, boolean>>(MatDialogRef);

  /** Close the dialog and signal confirmation. */
  confirm(): void {
    this.dialogRef.close(true);
  }

  /** Close the dialog without confirming. */
  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
