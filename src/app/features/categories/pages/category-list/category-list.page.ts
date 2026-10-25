import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';

import { Categories } from '../../categories';
import { CategoryResponse } from '../../models/category-response.model';
import { AppError } from '../../../../core/http/app-error.model';
import { NotificationService } from '../../../../core/notification/notification';
import {
  CategoryFormDialog,
  CategoryFormDialogData,
} from '../../dialogs/category-form/category-form.dialog';
import { ConfirmDialogComponent } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { HasRoleDirective } from '../../../../core/auth/has-permission';

/**
 * Paginated list page for categories (public).
 *
 * Displays category_name, created_at and updated_at in a Material table.
 * The products array is intentionally not rendered here because the list
 * endpoint always returns it empty -- rendering it would silently show
 * nothing and mislead students into thinking the data is missing.
 *
 * Create and edit actions open CategoryFormDialog; delete shows the shared
 * ConfirmDialogComponent. Both mutation actions are wrapped in *appHasRole
 * so only ADMIN users see them -- the backend enforces the same constraint.
 *
 * A 422 on delete means the category still has products: the backend message
 * is shown in a snackbar and the row stays in the table.
 */
@Component({
  selector: 'app-category-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DatePipe,
    HasRoleDirective,
  ],
  templateUrl: './category-list.page.html',
  styleUrl: './category-list.page.scss',
})
export class CategoryListPage implements OnInit {
  private readonly categoriesService = inject(Categories);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);

  protected readonly displayedColumns = [
    'category_name',
    'created_at',
    'updated_at',
    'actions',
  ];

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * Loads one page of categories from the backend.
   * Called on init and after pagination, create, edit or delete.
   */
  protected loadCategories(): void {
    this.loading.set(true);
    this.error.set(null);

    this.categoriesService
      .getCategories(this.page(), this.pageSize())
      .subscribe({
        next: (page) => {
          this.categories.set(page.content);
          this.totalElements.set(page.totalElements);
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
    this.loadCategories();
  }

  /**
   * Opens the create dialog. Appends the new category to the list on success
   * and reloads to get the correct server-authoritative order.
   */
  protected openCreateDialog(): void {
    const ref = this.dialog.open(CategoryFormDialog);
    ref.afterClosed().subscribe((created: CategoryResponse | undefined) => {
      if (created) {
        // Reload to reflect server ordering rather than appending locally
        this.loadCategories();
        this.notification.success(`Category "${created.category_name}" created.`);
      }
    });
  }

  /**
   * Opens the edit dialog pre-filled with the existing category.
   * Refreshes the row from the returned CategoryResponse on success.
   *
   * @param category - the category to edit
   */
  protected openEditDialog(category: CategoryResponse): void {
    const data: CategoryFormDialogData = { category };
    const ref = this.dialog.open(CategoryFormDialog, { data });
    ref.afterClosed().subscribe((updated: CategoryResponse | undefined) => {
      if (updated) {
        this.categories.update((list) =>
          list.map((c) => (c.id === updated.id ? updated : c)),
        );
      }
    });
  }

  /**
   * Confirms then deletes a category.
   *
   * A 422 response means the category still has products. The snackbar
   * shows the backend message and the row stays -- the user must delete or
   * move all products first.
   *
   * @param category - the category to delete
   */
  protected deleteCategory(category: CategoryResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete category',
        message: `Delete category "${category.category_name}"? This cannot be undone.`,
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.categoriesService.deleteCategory(category.id).subscribe({
        next: () => {
          this.categories.update((list) =>
            list.filter((c) => c.id !== category.id),
          );
          this.totalElements.update((n) => n - 1);
          this.notification.success('Category deleted.');
        },
        error: (err: AppError) => {
          // 422: category still has products -- show message, keep row
          this.notification.error(err.message);
        },
      });
    });
  }
}
