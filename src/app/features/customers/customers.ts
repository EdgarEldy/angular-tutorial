import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { PageResponse } from '../../shared/models/page-response.model';
import { buildPaginationParams } from '../../shared/pagination/pagination-params';
import { CustomerRequest } from './models/customer-request.model';
import { CustomerResponse } from './models/customer-response.model';
import { OrderResponse } from './models/order-response.model';

/**
 * Service for the /api/v1/customers resource (Business API).
 *
 * This is the single point of contact with HttpClient for the customers
 * resource. Components never inject HttpClient directly; they call these
 * methods. Services never contain UI logic: no snackbars, no navigation.
 *
 * GET /customers and GET /customers/{id} require authentication (authGuard
 * on the routes). POST, PUT and DELETE require the ADMIN role; the backend
 * enforces this -- the UI hides those actions from non-admins but the
 * backend is the authority.
 *
 * A duplicate email on POST or PUT triggers a 422 (BUSINESS_RULE). The
 * errorInterceptor maps this to AppError.kind === 'BUSINESS_RULE' and the
 * dialog must display err.message inline and remain open.
 *
 * DELETE can also return 422 when the customer has associated orders. The
 * caller must handle this by showing the backend message and keeping the row.
 */
@Injectable({ providedIn: 'root' })
export class Customers {
  private readonly http = inject(HttpClient);
  // environment.apiUrl resolves to /api/v1, proxied to the Business API
  private readonly base = `${environment.apiUrl}/customers`;

  /**
   * Returns one page of customers, optionally filtered by name.
   *
   * The `search` parameter is sent only when non-empty. An empty search
   * string must NOT be serialised as `search=` -- buildPaginationParams
   * handles this by accepting the term in its `search` field and skipping
   * blank values.
   *
   * @param page   - 0-based page index matching MatPaginator.pageIndex
   * @param size   - number of items per page
   * @param search - optional name search term; omitted when blank
   * @returns Observable of PageResponse wrapping CustomerResponse[]
   */
  getCustomers(
    page: number,
    size: number,
    search?: string,
  ): Observable<PageResponse<CustomerResponse>> {
    // buildPaginationParams skips the 'search' field when it is blank
    const params = buildPaginationParams({ page, size, search });
    return this.http
      .get<ApiResponse<PageResponse<CustomerResponse>>>(this.base, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Returns a single customer by id, with the products they have ordered.
   *
   * The `products` array in CustomerResponse is filled only by this endpoint.
   * The list endpoint always returns an empty products array to keep
   * paginated responses lean.
   *
   * @param id - customer id
   * @returns Observable of CustomerResponse (with products array populated)
   */
  getCustomer(id: number): Observable<CustomerResponse> {
    return this.http
      .get<ApiResponse<CustomerResponse>>(`${this.base}/${id}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Returns a paginated list of orders for one customer.
   *
   * Used on the CustomerDetailPage to show the orders tab. The backend
   * returns 404 when the customer id does not exist; the errorInterceptor
   * maps this to AppError.kind === 'NOT_FOUND'.
   *
   * @param customerId - id of the customer whose orders are fetched
   * @param page       - 0-based page index
   * @param size       - items per page
   * @returns Observable of PageResponse wrapping OrderResponse[]
   */
  getCustomerOrders(
    customerId: number,
    page: number,
    size: number,
  ): Observable<PageResponse<OrderResponse>> {
    const params = buildPaginationParams({ page, size });
    return this.http
      .get<ApiResponse<PageResponse<OrderResponse>>>(
        `${this.base}/${customerId}/orders`,
        { params },
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Creates a new customer (POST /api/v1/customers).
   *
   * The backend returns 201 with the created CustomerResponse.
   * A 422 (BUSINESS_RULE) is returned when the email is already taken.
   * ADMIN role required; enforced by the backend.
   *
   * @param body - customer fields (first_name, last_name, telephone, email, address)
   * @returns Observable of the created CustomerResponse
   */
  createCustomer(body: CustomerRequest): Observable<CustomerResponse> {
    return this.http
      .post<ApiResponse<CustomerResponse>>(this.base, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Updates an existing customer (PUT /api/v1/customers/{id}).
   *
   * A 422 (BUSINESS_RULE) is returned when the new email conflicts with
   * another existing customer. ADMIN role required.
   *
   * @param id   - customer id
   * @param body - updated fields
   * @returns Observable of the updated CustomerResponse
   */
  updateCustomer(id: number, body: CustomerRequest): Observable<CustomerResponse> {
    return this.http
      .put<ApiResponse<CustomerResponse>>(`${this.base}/${id}`, body)
      .pipe(map((res) => res.data));
  }

  /**
   * Deletes a customer (DELETE /api/v1/customers/{id}).
   *
   * The backend may reject the deletion with 422 (BUSINESS_RULE) when the
   * customer has associated orders. The caller must show the backend message
   * and keep the row visible.
   * ADMIN role required.
   *
   * @param id - customer id
   * @returns Observable<void>
   */
  deleteCustomer(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }
}
