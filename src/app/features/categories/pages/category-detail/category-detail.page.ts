import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe, CurrencyPipe } from '@angular/common';

import { LoadingComponent } from '../../../../shared/ui/loading/loading';
import { ErrorBannerComponent } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state/empty-state';

import { Categories } from '../../categories';
import { CategoryResponse } from '../../models/category-response.model';
import { AppError } from '../../../../core/http/app-error.model';

/**
 * Detail page for a single category (public).
 *
 * Shows the category metadata (name, created_at, updated_at) and the list
 * of products that belong to it. The products array is populated by the
 * GET /api/v1/categories/{id} endpoint -- this is the only endpoint that
 * fills it; the list endpoint always returns an empty array.
 *
 * The :id route parameter is read from ActivatedRoute. If the category
 * does not exist the backend returns 404 and the NOT_FOUND error is shown
 * inline with a "Back to categories" link.
 */
@Component({
  selector: 'app-category-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    DatePipe,
    CurrencyPipe,
    LoadingComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './category-detail.page.html',
  styleUrl: './category-detail.page.scss',
})
export class CategoryDetailPage implements OnInit {
  private readonly categoriesService = inject(Categories);
  // ActivatedRoute gives access to the :id URL parameter
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly category = signal<CategoryResponse | null>(null);

  protected readonly productColumns = [
    'product_name',
    'unit_price',
    'category_name',
  ];

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadCategory();
  }

  /**
   * Reads the :id param from the URL and loads the category with its products.
   *
   * snapshot.paramMap is used instead of subscribing to paramMap because
   * this page is not reused while navigating between detail pages -- the
   * component is re-created for each route activation.
   */
  protected loadCategory(): void {
    this.loading.set(true);
    this.error.set(null);

    // paramMap.get() returns null when the param is absent; coerce to number
    const idParam = this.route.snapshot.paramMap.get('id');
    // parseInt returns NaN for non-numeric values; the backend will 404
    const id = idParam !== null ? parseInt(idParam, 10) : NaN;

    this.categoriesService.getCategory(id).subscribe({
      next: (cat) => {
        this.category.set(cat);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }
}
