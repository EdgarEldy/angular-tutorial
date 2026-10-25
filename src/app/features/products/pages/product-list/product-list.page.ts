import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Products } from '../../products';
import { ProductResponse } from '../../models/product-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';
import { Categories } from '../../../categories/categories';
import { CategoryResponse } from '../../../categories/models/category-response.model';
import {
  ProductFormDialog,
  ProductFormDialogData,
} from '../../dialogs/product-form/product-form.dialog';
import { ConfirmDialogComponent } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { HasRoleDirective } from '../../../../core/auth/has-permission';
import { MoneyPipe } from '../../../../shared/pipes/money-pipe';

/**
 * Paginated list page for products with filters (public).
 *
 * Displays product_name, category_name (denormalized on the product, no extra
 * request per row), unit_price and actions in a Material table.
 *
 * Filters:
 *  - Category select: resets page to 0 and reloads immediately on change.
 *  - Product name search: debounced 300 ms via toObservable + debounceTime so
 *    the user can type without triggering a request on every keystroke.
 *  - Min / max price: resets and reloads immediately on change (blur event).
 *
 * The debounce approach uses toObservable(signal) + takeUntilDestroyed() at
 * field initialisation time, so the subscription is automatically cleaned up
 * when the component is destroyed without a manual unsubscribe.
 *
 * ADMIN-only actions (create, edit, delete) are wrapped in *appHasRole so
 * they are invisible to non-admin users. The backend enforces the same rule.
 */
@Component({
  selector: 'app-product-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    HasRoleDirective,
    MoneyPipe,
  ],
  templateUrl: './product-list.page.html',
  styleUrl: './product-list.page.scss',
})
export class ProductListPage implements OnInit {
  private readonly productsService = inject(Products);
  private readonly categoriesService = inject(Categories);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  // DestroyRef lets us call takeUntilDestroyed() without passing it explicitly
  // inside a constructor -- at field initialisation we are still in injection context
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly products = signal<ProductResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);

  // Categories list for the filter select
  protected readonly categories = signal<CategoryResponse[]>([]);

  // Filter signals -- undefined / empty means "no filter"
  protected readonly filterCategoryId = signal<number | undefined>(undefined);
  protected readonly filterProductName = signal('');
  protected readonly filterMinPrice = signal<number | undefined>(undefined);
  protected readonly filterMaxPrice = signal<number | undefined>(undefined);

  protected readonly displayedColumns = [
    'product_name',
    'category_name',
    'unit_price',
    'actions',
  ];

  constructor() {
    // Debounce the product name input: react to the signal value via toObservable,
    // wait 300 ms of quiet, and reload only when the value actually changes.
    // takeUntilDestroyed() with the stored DestroyRef unsubscribes on destroy.
    // This subscription is set up at construction time (injection context is active).
    toObservable(this.filterProductName)
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.page.set(0);
        this.loadProducts();
      });
  }

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  /**
   * Loads the full categories list for the filter select.
   * Uses a large page size to fetch all categories in one request.
   * This reuses the shared CategoriesService rather than duplicating the call.
   */
  protected loadCategories(): void {
    this.categoriesService.getCategories(0, 200).subscribe({
      next: (page) => this.categories.set(page.content),
      error: () => {
        // Category load failure is non-critical: the filter select stays empty
        // and the product list still loads. We do not set the global error state.
      },
    });
  }

  /**
   * Loads one page of products from the backend, applying current filters.
   * Called on init and after pagination, filter changes, create, edit or delete.
   */
  protected loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.productsService
      .getProducts(this.page(), this.pageSize(), {
        categoryId: this.filterCategoryId(),
        productName: this.filterProductName() || undefined,
        minPrice: this.filterMinPrice(),
        maxPrice: this.filterMaxPrice(),
      })
      .subscribe({
        next: (pageResult) => {
          this.products.set(pageResult.content);
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
   * Handles MatPaginator page changes.
   *
   * @param event - PageEvent carrying the new pageIndex and pageSize
   */
  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadProducts();
  }

  /**
   * Handles category filter select changes.
   * An empty string value from the "All categories" option is mapped to undefined.
   *
   * @param value - category id or empty string (no filter)
   */
  protected onCategoryFilter(value: number | string): void {
    this.filterCategoryId.set(value === '' ? undefined : Number(value));
    this.page.set(0);
    this.loadProducts();
  }

  /**
   * Updates the product name filter signal.
   * The debounced subscription set up in the constructor reacts to this change
   * and triggers the actual reload after 300 ms of quiet.
   *
   * @param name - current value of the name input
   */
  protected onNameFilter(name: string): void {
    this.filterProductName.set(name);
    // Do NOT call loadProducts here -- the constructor subscription does it
    // after the debounce interval to avoid a request on every keystroke.
  }

  /**
   * Handles min or max price filter changes (blur or enter).
   * Resets page to 0 and reloads immediately.
   */
  protected onPriceFilter(): void {
    this.page.set(0);
    this.loadProducts();
  }

  /**
   * Opens the create dialog. Reloads the list on success.
   */
  protected openCreateDialog(): void {
    const ref = this.dialog.open<ProductFormDialog, ProductFormDialogData, ProductResponse>(
      ProductFormDialog,
    );
    ref.afterClosed().subscribe((created: ProductResponse | undefined) => {
      if (created) {
        this.loadProducts();
        this.notification.success(`Product "${created.product_name}" created.`);
      }
    });
  }

  /**
   * Opens the edit dialog pre-filled with the existing product.
   * Refreshes the row from the returned ProductResponse on success.
   *
   * @param product - the product to edit
   */
  protected openEditDialog(product: ProductResponse): void {
    const data: ProductFormDialogData = { product };
    const ref = this.dialog.open<ProductFormDialog, ProductFormDialogData, ProductResponse>(
      ProductFormDialog,
      { data },
    );
    ref.afterClosed().subscribe((updated: ProductResponse | undefined) => {
      if (updated) {
        this.products.update((list) =>
          list.map((p) => (p.id === updated.id ? updated : p)),
        );
      }
    });
  }

  /**
   * Confirms then deletes a product.
   *
   * @param product - the product to delete
   */
  protected deleteProduct(product: ProductResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete product',
        message: `Delete product "${product.product_name}"? This cannot be undone.`,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.productsService.deleteProduct(product.id).subscribe({
        next: () => {
          this.products.update((list) =>
            list.filter((p) => p.id !== product.id),
          );
          this.totalElements.update((n) => n - 1);
          this.notification.success('Product deleted.');
        },
        error: (err: AppError) => {
          this.notification.error(err.message);
        },
      });
    });
  }
}
