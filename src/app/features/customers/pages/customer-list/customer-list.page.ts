import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Customers } from '../../customers';
import { CustomerResponse } from '../../models/customer-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header';
import { LoadingComponent } from '../../../../shared/ui/loading/loading';
import { ErrorBannerComponent } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state';
import { HasRoleDirective } from '../../../../core/auth/has-permission';
import { ConfirmDialogComponent } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import {
  CustomerFormDialog,
  CustomerFormDialogData,
} from '../../dialogs/customer-form/customer-form.dialog';

/**
 * Paginated list page for customers (authenticated users only).
 *
 * Displays first_name + last_name (combined as full name), email, telephone
 * and actions in a Material table. Navigating to a row opens the detail page.
 *
 * Search filter:
 *   A debounced name search (300 ms) uses toObservable(filterSearch) +
 *   debounceTime so the user can type without triggering a request on every
 *   keystroke. The subscription is set up in the constructor (injection context
 *   is active) and cleaned up automatically by takeUntilDestroyed.
 *
 * Three page states:
 *   loading -> spinner
 *   error   -> message + Retry button (re-calls loadCustomers)
 *   empty   -> "No customers found"
 *   data    -> table + paginator
 *
 * ADMIN-only actions (create, edit, delete) are wrapped in *appHasRole so
 * they are invisible to non-admin users. The backend enforces the same rule.
 *
 * Deletion can be rejected with 422 (BUSINESS_RULE) when the customer has
 * associated orders. The backend message is shown via NotificationService.
 */
@Component({
  selector: 'app-customer-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    HasRoleDirective,
    PageHeaderComponent,
    LoadingComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './customer-list.page.html',
  styleUrl: './customer-list.page.scss',
})
export class CustomerListPage implements OnInit {
  private readonly customersService = inject(Customers);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  // DestroyRef lets us call takeUntilDestroyed() outside the constructor at
  // field declaration time while still being in the injection context.
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly customers = signal<CustomerResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);

  // Name search filter -- empty string means "no filter"
  protected readonly filterSearch = signal('');

  protected readonly displayedColumns = [
    'full_name',
    'email',
    'telephone',
    'actions',
  ];

  constructor() {
    // Debounce the name search input: convert the filterSearch signal to an
    // Observable, wait 300 ms of quiet, and reload only when the value actually
    // changes. takeUntilDestroyed() auto-unsubscribes when the component is
    // destroyed without needing an explicit ngOnDestroy.
    toObservable(this.filterSearch)
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        // Reset to page 0 so the user always sees the first page of results
        this.page.set(0);
        this.loadCustomers();
      });
  }

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadCustomers();
  }

  /**
   * Loads one page of customers from the backend, applying the current search.
   * Called on init, after pagination changes, and after create/edit/delete.
   * The search term is omitted when the filter signal is empty.
   */
  protected loadCustomers(): void {
    this.loading.set(true);
    this.error.set(null);

    // Pass undefined instead of '' so buildPaginationParams omits the param
    const search = this.filterSearch().trim() || undefined;

    this.customersService.getCustomers(this.page(), this.pageSize(), search).subscribe({
      next: (pageResult) => {
        this.customers.set(pageResult.content);
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
   * Updates the name filter signal. The debounced subscription in the
   * constructor will trigger a reload after 300 ms of quiet.
   *
   * @param value - current value of the search input
   */
  protected onSearchFilter(value: string): void {
    this.filterSearch.set(value);
    // Do NOT call loadCustomers here -- the constructor subscription does it
    // after the debounce interval.
  }

  /**
   * Handles MatPaginator page changes.
   *
   * @param event - PageEvent carrying the new pageIndex and pageSize
   */
  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadCustomers();
  }

  /**
   * Navigates to the customer detail page.
   *
   * @param customer - the customer row that was clicked
   */
  protected navigateToDetail(customer: CustomerResponse): void {
    void this.router.navigate(['/customers', customer.id]);
  }

  /**
   * Opens the create dialog. Reloads the list on success.
   */
  protected openCreateDialog(): void {
    const ref = this.dialog.open<CustomerFormDialog, CustomerFormDialogData, CustomerResponse>(
      CustomerFormDialog,
    );
    ref.afterClosed().subscribe((created: CustomerResponse | undefined) => {
      if (created) {
        this.loadCustomers();
        this.notification.success(
          `Customer "${created.first_name} ${created.last_name}" created.`,
        );
      }
    });
  }

  /**
   * Opens the edit dialog pre-filled with the existing customer.
   * Updates the row from the returned CustomerResponse on success.
   *
   * @param customer - the customer to edit
   */
  protected openEditDialog(customer: CustomerResponse): void {
    const data: CustomerFormDialogData = { customer };
    const ref = this.dialog.open<CustomerFormDialog, CustomerFormDialogData, CustomerResponse>(
      CustomerFormDialog,
      { data },
    );
    ref.afterClosed().subscribe((updated: CustomerResponse | undefined) => {
      if (updated) {
        this.customers.update((list) =>
          list.map((c) => (c.id === updated.id ? updated : c)),
        );
      }
    });
  }

  /**
   * Confirms then deletes a customer.
   * A 422 rejection (customer has orders) shows the backend message via snackbar.
   *
   * @param customer - the customer to delete
   */
  protected deleteCustomer(customer: CustomerResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete customer',
        message: `Delete customer "${customer.first_name} ${customer.last_name}"? This cannot be undone.`,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.customersService.deleteCustomer(customer.id).subscribe({
        next: () => {
          this.customers.update((list) =>
            list.filter((c) => c.id !== customer.id),
          );
          this.totalElements.update((n) => n - 1);
          this.notification.success('Customer deleted.');
        },
        error: (err: AppError) => {
          // 422 BUSINESS_RULE: the backend refused the deletion (e.g. customer
          // has orders). Display the backend message so the admin knows why.
          this.notification.error(err.message);
        },
      });
    });
  }
}
