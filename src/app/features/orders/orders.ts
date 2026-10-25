import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { PageResponse } from '../../shared/models/page-response.model';
import { buildPaginationParams } from '../../shared/pagination/pagination-params';
import { OrderRequest } from './models/order-request.model';
import { OrderResponse } from '../customers/models/order-response.model';

/**
 * Service for the /api/v1/orders resource (Business API).
 *
 * This is the single point of contact with HttpClient for the orders resource.
 * Components never inject HttpClient directly; they call these methods instead.
 * Services never contain UI logic: no snackbars, no navigation here.
 *
 * GET /orders and GET /orders/{id} require authentication (authGuard on the
 * routes). POST, PUT and DELETE require the ADMIN role; the backend enforces
 * this -- the UI hides those actions from non-admins but the backend is the
 * authority.
 *
 * The `total` field of an order is computed by the server (quantity * unit_price).
 * The UI may show a preview while creating an order but must always display the
 * server's returned total once the order is saved.
 *
 * Both the customer and product are embedded in the response so list pages can
 * display names without making extra requests per row.
 */
@Injectable({ providedIn: 'root' })
export class Orders {
  private readonly http = inject(HttpClient);
  // environment.apiUrl resolves to /api/v1, proxied to the Business API
  private readonly base = `${environment.apiUrl}/orders`;

  /**
   * Returns one page of orders, optionally filtered by customer and/or product.
   *
   * Filter values are appended as query parameters only when they are defined.
   * An undefined customerId or productId must NOT appear as customerId= in the
   * URL -- buildPaginationParams skips undefined extras automatically.
   *
   * @param page       - 0-based page index matching MatPaginator.pageIndex
   * @param size       - number of items per page
   * @param customerId - optional customer id filter; omitted when undefined
   * @param productId  - optional product id filter; omitted when undefined
   * @returns Observable of PageResponse wrapping OrderResponse[]
   */
  getOrders(
    page: number,
    size: number,
    customerId?: number,
    productId?: number,
  ): Observable<PageResponse<OrderResponse>> {
    // buildPaginationParams accepts extra key/value pairs and skips undefined values,
    // so passing undefined for customerId/productId produces no query param.
    const params: HttpParams = buildPaginationParams({ page, size }, {
      customerId,
      productId,
    });
    return this.http
      .get<ApiResponse<PageResponse<OrderResponse>>>(this.base, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Returns a single order by id, with the full customer and product embedded.
   *
   * The embedded customer and product objects allow the detail page to display
   * all information without additional requests.
   *
   * @param id - order id
   * @returns Observable of OrderResponse (customer and product fully populated)
   */
  getOrder(id: number): Observable<OrderResponse> {
    return this.http
      .get<ApiResponse<OrderResponse>>(`${this.base}/${id}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Creates a new order (POST /api/v1/orders).
   *
   * The backend returns 201 with the created OrderResponse including the
   * server-computed total (quantity * unit_price). ADMIN role required.
   *
   * @param body - customer_id, product_id and quantity
   * @returns Observable of the created OrderResponse
   */
  createOrder(body: OrderRequest): Observable<OrderResponse> {
    return this.http
      .post<ApiResponse<OrderResponse>>(this.base, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Updates an existing order (PUT /api/v1/orders/{id}).
   *
   * ADMIN role required. The backend recomputes the total from the new
   * quantity and the product's current unit_price; the returned OrderResponse
   * contains the authoritative total.
   *
   * @param id   - order id
   * @param body - updated customer_id, product_id and quantity
   * @returns Observable of the updated OrderResponse
   */
  updateOrder(id: number, body: OrderRequest): Observable<OrderResponse> {
    return this.http
      .put<ApiResponse<OrderResponse>>(`${this.base}/${id}`, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Deletes an order (DELETE /api/v1/orders/{id}).
   *
   * ADMIN role required.
   *
   * @param id - order id
   * @returns Observable<void>
   */
  deleteOrder(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }
}
