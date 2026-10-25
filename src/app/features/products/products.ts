import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { PageResponse } from '../../shared/models/page-response.model';
import { buildPaginationParams } from '../../shared/pagination/pagination-params';
import { ProductRequest } from './models/product-request.model';
import { ProductResponse } from './models/product-response.model';

/**
 * Optional filter parameters for GET /api/v1/products.
 *
 * This is an internal service shape -- it is not a model file because it
 * is not a JSON contract type. Keeping it here avoids an unnecessary extra
 * file and makes it easy to find the params next to the method that uses them.
 *
 * All fields are optional: empty values must NOT be sent as query params
 * (e.g. no categoryId= or productName=), so buildPaginationParams skips
 * any undefined or empty-string value automatically.
 */
export interface ProductFilters {
  /** Filter by category id. Omitted when undefined. */
  categoryId?: number;
  /** Case-insensitive "contains" search on product_name. Omitted when empty. */
  productName?: string;
  /** Minimum unit_price (inclusive). Omitted when undefined. */
  minPrice?: number;
  /** Maximum unit_price (inclusive). Omitted when undefined. */
  maxPrice?: number;
}

/**
 * Service for the /api/v1/products resource (Business API).
 *
 * This is the single place that injects HttpClient for products.
 * Components call these methods; they never touch HttpClient directly.
 * Services never contain UI logic: no snackbars, no navigation here.
 *
 * GET /products and GET /products/{id} are public endpoints (no JWT required).
 * POST, PUT and DELETE require the ADMIN role; the backend enforces this via
 * its own security layer -- the UI hides those actions from non-admins but
 * the backend is the authority.
 *
 * A PUT can return 409 (CONFLICT) when the product was modified by another
 * request since it was read. The errorInterceptor maps 409 to an AppError with
 * kind CONFLICT. The caller (ProductFormDialog) must handle this by showing
 * the message and offering to reload.
 */
@Injectable({ providedIn: 'root' })
export class Products {
  private readonly http = inject(HttpClient);
  // environment.apiUrl resolves to /api/v1, proxied to the Business API
  private readonly base = `${environment.apiUrl}/products`;

  /**
   * Returns one page of products, optionally filtered.
   *
   * Filter values that are undefined or empty string are NOT added to the
   * query string -- the backend interprets missing params as "no filter".
   * This is enforced by buildPaginationParams which skips falsy extras.
   *
   * @param page    - 0-based page index (matches MatPaginator.pageIndex)
   * @param size    - number of items per page
   * @param filters - optional filters; defaults to no filters
   * @returns Observable of PageResponse wrapping ProductResponse[]
   */
  getProducts(
    page: number,
    size: number,
    filters: ProductFilters = {},
  ): Observable<PageResponse<ProductResponse>> {
    // Pass filter values as extras; buildPaginationParams skips undefined/empty
    const params = buildPaginationParams({ page, size }, {
      categoryId: filters.categoryId,
      productName: filters.productName,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    });
    return this.http
      .get<ApiResponse<PageResponse<ProductResponse>>>(this.base, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Returns a single product by id.
   *
   * Use this on the product detail page. The list page uses getProducts()
   * to avoid an extra request per row.
   *
   * @param id - product id
   * @returns Observable of ProductResponse
   */
  getProduct(id: number): Observable<ProductResponse> {
    return this.http
      .get<ApiResponse<ProductResponse>>(`${this.base}/${id}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Creates a new product (POST /api/v1/products).
   *
   * The backend returns 201 with the created ProductResponse.
   * A 404 is returned when the category_id does not exist.
   *
   * @param body - product_name, unit_price, category_id
   * @returns Observable of the created ProductResponse
   */
  createProduct(body: ProductRequest): Observable<ProductResponse> {
    return this.http
      .post<ApiResponse<ProductResponse>>(this.base, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Updates an existing product (PUT /api/v1/products/{id}).
   *
   * Can return 409 (CONFLICT) when the product was modified by another request
   * since it was last read (optimistic locking). The errorInterceptor maps
   * this to AppError.kind === 'CONFLICT'. The dialog must catch this and
   * offer the user a "Reload" action.
   *
   * @param id   - product id
   * @param body - updated fields
   * @returns Observable of the updated ProductResponse
   */
  updateProduct(id: number, body: ProductRequest): Observable<ProductResponse> {
    return this.http
      .put<ApiResponse<ProductResponse>>(`${this.base}/${id}`, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Deletes a product (DELETE /api/v1/products/{id}).
   *
   * @param id - product id
   * @returns Observable<void>
   */
  deleteProduct(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }
}
