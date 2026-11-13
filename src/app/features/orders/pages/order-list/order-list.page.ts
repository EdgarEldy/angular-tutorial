import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header';
import { LoadingComponent } from '../../../../shared/ui/loading/loading';
import { ErrorBannerComponent } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { Orders } from '../../orders';
import { Customers } from '../../../customers/customers';
import { Products } from '../../../products/products';
import { CustomerOrdersResponse } from '../../models/customer-orders-response.model';
import { OrderResponse } from '../../../customers/models/order-response.model';
import { CustomerResponse } from '../../../customers/models/customer-response.model';
import { ProductResponse } from '../../../products/models/product-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';
import { HasRoleDirective } from '../../../../core/auth/has-permission';
import { ConfirmDialogComponent } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { MoneyPipe } from '../../../../shared/pipes/money-pipe';
import {
  OrderFormDialog,
  OrderFormDialogData,
} from '../../dialogs/order-form/order-form.dialog';

/**
 * Flat row derived from CustomerOrdersResponse for use in the Material table.
 *
 * GET /orders groups order lines by customer. The table needs one row per
 * order line, so the page flattens each CustomerOrdersResponse into one
 * OrderRow per entry in its products array. The customerId is kept so the
 * edit dialog can be pre-filled with the correct customer.
 */
interface OrderRow {
  /** Id of the individual order, used for GET/PUT/DELETE /orders/{id}. */
  orderId: number;
  /** Customer id, used to pre-fill the edit dialog. */
  customerId: number;
  /** Display name shown in the Customer column. */
  customerName: string;
  /** Product name shown in the Product column. */
  productName: string;
  /** Quantity for this order line. */
  quantity: number;
  /** Server-computed total for this order line. */
  total: number;
}

/**
 * Paginated list page for orders (authenticated users only).
 *
 * GET /orders returns CustomerOrdersResponse entries -- one per customer with
 * their order lines. The page flattens these into OrderRow values so the
 * Material table can display one row per order line. The paginator counts
 * customers, not individual orders; this is documented in the Orders service.
 *
 * Two filter selects (customer, product) are loaded once on init from
 * CustomersService and ProductsService using a large size=100 to approximate
 * a full list. Any filter change resets the page to 0 and reloads.
 *
 * Three page states:
 *   loading -> spinner
 *   error   -> message + Retry button
 *   empty   -> "No orders found."
 *   data    -> table + paginator
 *
 * ADMIN-only actions (create, edit, delete) are wrapped in *appHasRole so
 * they are invisible to non-admin users. The backend enforces the same rule.
 */
@Component({
  selector: 'app-order-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    HasRoleDirective,
    MoneyPipe,
    PageHeaderComponent,
    LoadingComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './order-list.page.html',
  styleUrl: './order-list.page.scss',
})
export class OrderListPage implements OnInit {
  private readonly ordersService = inject(Orders);
  private readonly customersService = inject(Customers);
  private readonly productsService = inject(Products);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  // --- Order list state -------------------------------------------------------
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  // Flattened rows: one per order line, derived from CustomerOrdersResponse[]
  protected readonly orders = signal<OrderRow[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);

  // --- Filter selects state ---------------------------------------------------
  // Signals hold the selected filter values; undefined means "no filter".
  protected readonly filterCustomerId = signal<number | undefined>(undefined);
  protected readonly filterProductId = signal<number | undefined>(undefined);

  // Customer and product lists for the filter selects -- loaded once on init
  protected readonly customerOptions = signal<CustomerResponse[]>([]);
  protected readonly productOptions = signal<ProductResponse[]>([]);

  protected readonly displayedColumns = [
    'id',
    'customer_name',
    'product_name',
    'quantity',
    'total',
    'actions',
  ];

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadOrders();
  }

  /**
   * Loads all customers and products into the filter selects.
   *
   * A large page size (100) approximates a full list without implementing
   * infinite scroll in a select. These calls are fire-and-forget for the
   * filter UI; failures are silently ignored because the core table still
   * works without filters.
   */
  private loadFilterOptions(): void {
    // Load up to 100 customers for the customer filter select
    this.customersService.getCustomers(0, 100).subscribe({
      next: (page) => this.customerOptions.set(page.content),
      // Silently ignore filter option load failures; the table still works
      error: () => undefined,
    });
    // Load up to 100 products for the product filter select
    this.productsService.getProducts(0, 100).subscribe({
      next: (page) => this.productOptions.set(page.content),
      error: () => undefined,
    });
  }

  /**
   * Loads one page of orders from the backend, applying current filters.
   * Called on init, after filter changes, and after create/edit/delete.
   *
   * The backend returns CustomerOrdersResponse entries grouped by customer.
   * This method flattens them into OrderRow values so each order line maps to
   * exactly one table row. The paginator still reflects the customer count
   * because totalElements counts customers, not individual order lines.
   */
  protected loadOrders(): void {
    this.loading.set(true);
    this.error.set(null);

    this.ordersService
      .getOrders(
        this.page(),
        this.pageSize(),
        this.filterCustomerId(),
        this.filterProductId(),
      )
      .subscribe({
        next: (pageResult) => {
          // Flatten: one CustomerOrdersResponse -> N OrderRow (one per order line)
          const rows: OrderRow[] = pageResult.content.flatMap(
            (entry: CustomerOrdersResponse) =>
              entry.products.map((line) => ({
                orderId: line.order_id,
                customerId: entry.customer.id,
                customerName: `${entry.customer.first_name} ${entry.customer.last_name}`,
                productName: line.product_name,
                quantity: line.quantity,
                total: line.total,
              })),
          );
          this.orders.set(rows);
          this.totalElements.set(pageResult.totalElements);
          this.loading.set(false);
        },
        error: (err: AppError) => {
          this.error.set(err);
          this.loading.set(false);
        },
      });
  }

  /**
   * Handles the customer filter select change.
   * Resets to page 0 so the user always sees the first matching page.
   *
   * @param value - selected customer id, or undefined for "all customers"
   */
  protected onCustomerFilter(value: number | undefined): void {
    this.filterCustomerId.set(value);
    this.page.set(0);
    this.loadOrders();
  }

  /**
   * Handles the product filter select change.
   *
   * @param value - selected product id, or undefined for "all products"
   */
  protected onProductFilter(value: number | undefined): void {
    this.filterProductId.set(value);
    this.page.set(0);
    this.loadOrders();
  }

  /**
   * Handles MatPaginator page changes.
   *
   * @param event - PageEvent carrying the new pageIndex and pageSize
   */
  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadOrders();
  }

  /**
   * Navigates to the order detail page.
   *
   * @param row - the flat order row that was clicked
   */
  protected navigateToDetail(row: OrderRow): void {
    void this.router.navigate(['/orders', row.orderId]);
  }

  /**
   * Opens the create dialog. Reloads the list on success.
   */
  protected openCreateDialog(): void {
    const ref = this.dialog.open<
      OrderFormDialog,
      OrderFormDialogData,
      OrderResponse
    >(OrderFormDialog);

    ref.afterClosed().subscribe((created: OrderResponse | undefined) => {
      if (created) {
        this.loadOrders();
        this.notification.success(`Order #${created.id} created.`);
      }
    });
  }

  /**
   * Fetches the full OrderResponse for the given row then opens the edit dialog.
   *
   * The list uses the grouped CustomerOrdersResponse shape; the edit dialog
   * needs a full OrderResponse (with embedded product details). One extra GET
   * is made per edit click so the dialog can display the existing product name
   * and pre-fill the quantity correctly.
   *
   * On success the list is fully reloaded so grouping and totals are consistent.
   *
   * @param row - the flat order row to edit
   */
  protected openEditDialog(row: OrderRow): void {
    // Fetch the full single-order representation before opening the dialog
    this.ordersService.getOrder(row.orderId).subscribe({
      next: (order: OrderResponse) => {
        const data: OrderFormDialogData = { order };
        const ref = this.dialog.open<
          OrderFormDialog,
          OrderFormDialogData,
          OrderResponse
        >(OrderFormDialog, { data });

        ref.afterClosed().subscribe((updated: OrderResponse | undefined) => {
          if (updated) {
            // Reload so the grouped list reflects the new data
            this.loadOrders();
          }
        });
      },
      error: (err: AppError) => {
        this.notification.error(err.message);
      },
    });
  }

  /**
   * Confirms then deletes an order.
   * Any error shows the backend message via snackbar.
   *
   * @param row - the flat order row to delete
   */
  protected deleteOrder(row: OrderRow): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete order',
        message: `Delete order #${row.orderId}? This cannot be undone.`,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.ordersService.deleteOrder(row.orderId).subscribe({
        next: () => {
          // Remove the row immediately without a full reload for responsiveness
          this.orders.update((list) =>
            list.filter((o) => o.orderId !== row.orderId),
          );
          this.totalElements.update((n) => n - 1);
          this.notification.success(`Order #${row.orderId} deleted.`);
        },
        error: (err: AppError) => {
          this.notification.error(err.message);
        },
      });
    });
  }
}
