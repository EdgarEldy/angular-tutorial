import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AppError } from '../../../core/http/app-error.model';

/**
 * Inline error banner for displaying AppError inside a page (not a toast).
 *
 * Demonstrates Angular 17+ signal-based outputs (output() function API).
 * Use for errors that require user attention in context – e.g., a failed
 * form submission that is not a validation error, or a 403/404 on load.
 *
 * For transient errors (network blip, conflict), prefer NotificationService
 * (toast). For persistent load failures, prefer this banner.
 *
 * Usage:
 *   @if (error()) {
 *     <app-error-banner [error]="error()!" (retry)="load()" />
 *   }
 */
@Component({
  selector: 'app-error-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './error-banner.html',
  styleUrl: './error-banner.scss',
})
export class ErrorBannerComponent {
  /** The typed error to display. */
  error = input.required<AppError>();

  /** Emitted when the user clicks the retry button. */
  retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
