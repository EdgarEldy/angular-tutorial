import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Full-width loading spinner used while async data is in flight.
 *
 * Pair with the @defer { } @loading { } block pattern in templates, or place
 * directly inside an @if (isLoading()) { } block driven by a signal.
 *
 * Usage with @defer:
 *   @defer (when dataReady()) {
 *     <app-product-list [products]="products()" />
 *   } @loading {
 *     <app-loading message="Loading products..." />
 *   }
 *
 * Usage with a signal:
 *   @if (loading()) {
 *     <app-loading />
 *   }
 */
@Component({
  selector: 'app-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule],
  templateUrl: './loading.html',
  styleUrl: './loading.scss',
})
export class LoadingComponent {
  /** Optional text shown below the spinner. */
  message = input<string>('Loading...');
}
