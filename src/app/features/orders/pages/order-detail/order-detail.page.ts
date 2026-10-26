import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { LoadingComponent } from '../../../../shared/ui/loading/loading';
import { ErrorBannerComponent } from '../../../../shared/ui/error-banner/error-banner';

import { Orders } from '../../orders';
import { OrderResponse } from '../../../customers/models/order-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { MoneyPipe } from '../../../../shared/pipes/money-pipe';

/**
 * Detail page for a single order (authenticated users only).
 *
 * Displays full order information including the embedded customer (name, email)
 * and product (name, unit price), plus the quantity and the server-computed total.
 *
 * The :id route parameter is read once from snapshot.paramMap because the
 * component is always destroyed and recreated when navigating between different
 * detail pages -- no need to subscribe to paramMap changes.
 *
 * Three page states:
 *   loading -> spinner
 *   error   -> message + Retry button
 *   data    -> order info card
 *
 * The total displayed is always the server's value (order.total), never a
 * client-side calculation. Client-side preview totals are only shown in the
 * create/edit dialog before the order is saved.
 */
@Component({
  selector: 'app-order-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MoneyPipe,
    LoadingComponent,
    ErrorBannerComponent,
  ],
  templateUrl: './order-detail.page.html',
  styleUrl: './order-detail.page.scss',
})
export class OrderDetailPage implements OnInit {
  private readonly ordersService = inject(Orders);
  // ActivatedRoute gives access to the :id URL parameter
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly order = signal<OrderResponse | null>(null);

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadOrder();
  }

  /**
   * Parses the :id route parameter and loads the order detail.
   *
   * snapshot.paramMap.get returns null when the param is absent.
   * parseInt returns NaN for non-numeric strings; the backend will then 404.
   */
  protected loadOrder(): void {
    this.loading.set(true);
    this.error.set(null);

    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam !== null ? parseInt(idParam, 10) : NaN;

    this.ordersService.getOrder(id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }
}
