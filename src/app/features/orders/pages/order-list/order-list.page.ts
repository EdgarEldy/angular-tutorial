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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { Orders } from '../../orders';
import { Customers } from '../../../customers/customers';
import { Products } from '../../../products/products';
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
 * Paginated list page for orders (authenticated users only).
 *
 * Displays order id, customer full name, product name, quantity and total
 * in a Material table. Customers and products embedded in each OrderResponse
 * provide those names directly -- no extra HTTP request per row.
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
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    HasRoleDirective,
    MoneyPipe,
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
  protected readonly orders = signal<OrderResponse[]>([]);
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
          this.orders.set(pageResult.content);
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
   * @param order - the order row that was clicked
   */
  protected navigateToDetail(order: OrderResponse): void {
    void this.router.navigate(['/orders', order.id]);
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
   * Opens the edit dialog pre-filled with the existing order.
   * Replaces the row from the returned OrderResponse on success.
   *
   * @param order - the order to edit
   */
  protected openEditDialog(order: OrderResponse): void {
    const data: OrderFormDialogData = { order };
    const ref = this.dialog.open<
      OrderFormDialog,
      OrderFormDialogData,
      OrderResponse
    >(OrderFormDialog, { data });

    ref.afterClosed().subscribe((updated: OrderResponse | undefined) => {
      if (updated) {
        // Update the specific row without reloading the entire list
        this.orders.update((list) =>
          list.map((o) => (o.id === updated.id ? updated : o)),
        );
      }
    });
  }

  /**
   * Confirms then deletes an order.
   * Any error shows the backend message via snackbar.
   *
   * @param order - the order to delete
   */
  protected deleteOrder(order: OrderResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete order',
        message: `Delete order #${order.id}? This cannot be undone.`,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.ordersService.deleteOrder(order.id).subscribe({
        next: () => {
          // Remove the deleted row from the signal without a full reload
          this.orders.update((list) => list.filter((o) => o.id !== order.id));
          this.totalElements.update((n) => n - 1);
          this.notification.success(`Order #${order.id} deleted.`);
        },
        error: (err: AppError) => {
          this.notification.error(err.message);
        },
      });
    });
  }
}
