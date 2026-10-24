import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * Empty-state placeholder shown when a list or resource has no items.
 *
 * Uses signal-based inputs (Angular 17+) and built-in @if control flow.
 * The action slot projects a CTA button (e.g. "Create your first product")
 * without hard-coding navigation logic inside this component.
 *
 * Usage:
 *   <app-empty-state
 *     icon="inventory_2"
 *     title="No products yet"
 *     message="Create your first product to get started.">
 *     <button mat-flat-button color="primary" (click)="openCreate()">Add product</button>
 *   </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyStateComponent {
  /** Material icon name displayed above the title. */
  icon = input<string>('inbox');

  /** Primary heading. */
  title = input.required<string>();

  /** Optional supporting text below the title. */
  message = input<string>();
}
