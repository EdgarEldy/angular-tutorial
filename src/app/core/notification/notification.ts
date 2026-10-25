import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

/** Severity level that controls the CSS panel class applied to the snack bar. */
export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

const DEFAULT_DURATION_MS = 4000;

const PANEL_CLASSES: Record<NotificationSeverity, string> = {
  success: 'snack-success',
  error: 'snack-error',
  warning: 'snack-warning',
  info: 'snack-info',
};

/**
 * Application-wide toast notification service backed by MatSnackBar.
 *
 * Components and interceptors call one of the convenience methods instead of
 * injecting MatSnackBar directly. The service centralises the config (duration,
 * position, CSS classes) so they are consistent across the app.
 *
 * Usage:
 *   private notification = inject(NotificationService);
 *   this.notification.success('Product saved.');
 *   this.notification.error('Network error – try again.');
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  /** Show a success toast. */
  success(message: string, duration = DEFAULT_DURATION_MS): void {
    this.show(message, 'success', duration);
  }

  /** Show an error toast. */
  error(message: string, duration = DEFAULT_DURATION_MS): void {
    this.show(message, 'error', duration);
  }

  /** Show a warning toast. */
  warning(message: string, duration = DEFAULT_DURATION_MS): void {
    this.show(message, 'warning', duration);
  }

  /** Show an informational toast. */
  info(message: string, duration = DEFAULT_DURATION_MS): void {
    this.show(message, 'info', duration);
  }

  /**
   * Opens a MatSnackBar with a CSS panel class that maps to the severity colour.
   *
   * Panel classes (`snack-success`, `snack-error`, etc.) must be defined in the
   * global stylesheet because Angular Material injects the overlay outside the
   * component's shadow. The Dismiss action closes the bar before the timeout.
   *
   * @param message - text to display
   * @param severity - controls the CSS class applied to the panel
   * @param duration - auto-dismiss timeout in milliseconds
   */
  private show(message: string, severity: NotificationSeverity, duration: number): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass: [PANEL_CLASSES[severity]],
    };
    this.snackBar.open(message, 'Dismiss', config);
  }
}
