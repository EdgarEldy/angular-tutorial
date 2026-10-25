import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

import { Customers } from '../../customers';
import { CustomerResponse } from '../../models/customer-response.model';
import { OrderResponse } from '../../models/order-response.model';
import { ProductResponse } from '../../../products/models/product-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { MoneyPipe } from '../../../../shared/pipes/money-pipe';

/**
 * Detail page for a single customer (authenticated users only).
 *
 * Shows three sections:
 *  1. Customer info card: name, email, telephone, address.
 *  2. Products list: products the customer has ordered, read from the
 *     CustomerResponse.products array (filled only by GET /customers/{id}).
 *  3. Paginated orders table: id, product name, quantity, total -- loaded from
 *     GET /customers/{id}/orders. Total is formatted with MoneyPipe.
 *
 * Each section has its own loading / error / empty / data state so a failure
 * in one section does not block the others.
 *
 * The :id route parameter is read once from snapshot.paramMap because the
 * component is always destroyed and recreated when navigating between different
 * detail pages -- no need to subscribe to paramMap changes.
 *
 * If the customer does not exist the backend returns 404. The NOT_FOUND error
 * is shown with a "Back to customers" link.
 */
@Component({
  selector: 'app-customer-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MoneyPipe,
  ],
  templateUrl: './customer-detail.page.html',
  styleUrl: './customer-detail.page.scss',
})
export class CustomerDetailPage implements OnInit {
  private readonly customersService = inject(Customers);
  // ActivatedRoute gives access to the :id URL parameter
  private readonly route = inject(ActivatedRoute);

  // --- Customer info state -------------------------------------------------
  protected readonly loadingCustomer = signal(true);
  protected readonly errorCustomer = signal<AppError | null>(null);
  protected readonly customer = signal<CustomerResponse | null>(null);

  // --- Products section state (from CustomerResponse.products) -------------
  protected readonly products = signal<ProductResponse[]>([]);

  // --- Orders section state ------------------------------------------------
  protected readonly loadingOrders = signal(true);
  protected readonly errorOrders = signal<AppError | null>(null);
  protected readonly orders = signal<OrderResponse[]>([]);
  protected readonly ordersTotalElements = signal(0);
  protected readonly ordersPage = signal(0);
  protected readonly ordersPageSize = signal(10);

  protected readonly orderColumns = [
    'order_id',
    'product_name',
    'quantity',
    'total',
  ];

  protected readonly productColumns = ['product_name', 'unit_price'];

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadCustomer();
  }

  /**
   * Parses the :id route parameter and loads the customer detail.
   * On success also loads the first page of orders for this customer.
   */
  protected loadCustomer(): void {
    this.loadingCustomer.set(true);
    this.errorCustomer.set(null);

    // snapshot.paramMap.get returns null when the param is absent
    const idParam = this.route.snapshot.paramMap.get('id');
    // parseInt returns NaN for non-numeric strings; the backend will then 404
    const id = idParam !== null ? parseInt(idParam, 10) : NaN;

    this.customersService.getCustomer(id).subscribe({
      next: (cust) => {
        this.customer.set(cust);
        // products is populated by the detail endpoint only
        this.products.set(cust.products);
        this.loadingCustomer.set(false);
        // Load orders now that we know the customer exists
        this.loadOrders(id);
      },
      error: (err: AppError) => {
        this.errorCustomer.set(err);
        this.loadingCustomer.set(false);
        // Do not attempt orders load if the customer was not found
        this.loadingOrders.set(false);
      },
    });
  }

  /**
   * Loads one page of orders for the customer.
   * Called after the customer is loaded successfully, and when the paginator changes.
   *
   * @param customerId - id of the customer whose orders to load
   */
  protected loadOrders(customerId: number): void {
    this.loadingOrders.set(true);
    this.errorOrders.set(null);

    this.customersService
      .getCustomerOrders(customerId, this.ordersPage(), this.ordersPageSize())
      .subscribe({
        next: (pageResult) => {
          this.orders.set(pageResult.content);
          this.ordersTotalElements.set(pageResult.totalElements);
          this.loadingOrders.set(false);
        },
        error: (err: AppError) => {
          this.errorOrders.set(err);
          this.loadingOrders.set(false);
        },
      });
  }

  /**
   * Handles paginator page changes on the orders table.
   *
   * @param event - PageEvent carrying the new pageIndex and pageSize
   */
  protected onOrdersPage(event: PageEvent): void {
    this.ordersPage.set(event.pageIndex);
    this.ordersPageSize.set(event.pageSize);
    const id = this.customer()?.id;
    if (id !== undefined) {
      this.loadOrders(id);
    }
  }
}
