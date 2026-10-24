import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Reusable page-header bar with a title, optional subtitle, and an action slot.
 *
 * Demonstrates Angular 17+ signal-based inputs (input() function API).
 * The action slot uses content projection (ng-content) so callers can place
 * any element – typically a "New" button – without coupling this component to
 * any specific action.
 *
 * Usage:
 *   <app-page-header title="Products" subtitle="Manage your catalogue">
 *     <button mat-flat-button color="primary" (click)="openCreate()">New product</button>
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeaderComponent {
  /** Main heading text. Required. */
  title = input.required<string>();

  /** Optional secondary line below the title. */
  subtitle = input<string>();
}
