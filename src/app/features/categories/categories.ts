import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { PageResponse } from '../../shared/models/page-response.model';
import { CategoryRequest } from './models/category-request.model';
import { CategoryResponse } from './models/category-response.model';

/**
 * Service for the /api/v1/categories resource (Business API).
 *
 * This is the single place that injects HttpClient for categories.
 * Components and dialogs call these methods and never touch HttpClient
 * directly -- this keeps the HTTP concern isolated and testable.
 *
 * The service also acts as a shared data source for the products feature:
 * the product create/edit dialog calls getCategories() to populate the
 * category select, so there is no duplication of the HTTP call logic.
 *
 * GET /categories and GET /categories/{id} are public endpoints (no JWT
 * required). POST, PUT, DELETE require the ADMIN role; the backend enforces
 * this via its own security layer -- the UI hides those actions from
 * non-admins but the backend is the authority.
 */
@Injectable({ providedIn: 'root' })
export class Categories {
  private readonly http = inject(HttpClient);
  // environment.apiUrl resolves to /api/v1, proxied to the Business API
  private readonly base = `${environment.apiUrl}/categories`;

  /**
   * Returns one page of categories.
   *
   * The products array inside each CategoryResponse will always be empty for
   * the list endpoint -- do not render it from this result.
   *
   * @param page - 0-based page index (matches MatPaginator.pageIndex)
   * @param size - number of items per page
   * @returns Observable of PageResponse wrapping CategoryResponse[]
   */
  getCategories(page: number, size: number): Observable<PageResponse<CategoryResponse>> {
    // HttpParams is immutable; each .set() returns a new instance
    const params = { page: String(page), size: String(size) };
    return this.http
      .get<ApiResponse<PageResponse<CategoryResponse>>>(this.base, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Returns a single category with its products populated.
   *
   * Use this only on the detail page. The list page uses getCategories()
   * to avoid an extra request per row.
   *
   * @param id - category id
   * @returns Observable of CategoryResponse with products filled
   */
  getCategory(id: number): Observable<CategoryResponse> {
    return this.http
      .get<ApiResponse<CategoryResponse>>(`${this.base}/${id}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Creates a new category (POST /api/v1/categories).
   *
   * The backend returns 201 with the created CategoryResponse.
   * The products array will be empty in the response.
   *
   * @param body - category_name field
   * @returns Observable of the created CategoryResponse
   */
  createCategory(body: CategoryRequest): Observable<CategoryResponse> {
    return this.http
      .post<ApiResponse<CategoryResponse>>(this.base, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Updates an existing category (PUT /api/v1/categories/{id}).
   *
   * @param id - category id
   * @param body - updated category_name
   * @returns Observable of the updated CategoryResponse
   */
  updateCategory(id: number, body: CategoryRequest): Observable<CategoryResponse> {
    return this.http
      .put<ApiResponse<CategoryResponse>>(`${this.base}/${id}`, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Deletes a category (DELETE /api/v1/categories/{id}).
   *
   * The backend returns 422 (BUSINESS_RULE) when the category still has
   * at least one product. The errorInterceptor maps this to an AppError with
   * kind BUSINESS_RULE and the backend's message. The caller (CategoryListPage)
   * shows that message in a snackbar and keeps the row visible.
   *
   * @param id - category id
   * @returns Observable<void>
   */
  deleteCategory(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }
}
