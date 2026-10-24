import { HttpParams } from '@angular/common/http';

/** Parameters accepted by every paginated collection endpoint. */
export interface PaginationParams {
  /** 0-based page index matching MatPaginator.pageIndex. */
  page: number;
  /** Number of items per page matching MatPaginator.pageSize. */
  size: number;
  /** Optional sort field name (e.g. 'name', 'createdAt'). */
  sort?: string;
  /** Sort direction. Defaults to 'asc'. */
  direction?: 'asc' | 'desc';
  /** Optional search / filter term sent as the 'search' query param. */
  search?: string;
}

/**
 * Builds an HttpParams object from pagination and filter parameters.
 *
 * HttpParams is immutable – each .set() call returns a new instance. This
 * helper avoids the common bug of mutating and discarding the result.
 * Empty strings and undefined values are omitted so they do not appear in
 * the query string.
 *
 * Usage:
 *   const params = buildPaginationParams({ page: 0, size: 10, search: 'foo' });
 *   this.http.get<ApiResponse<PageResponse<Product>>>('/api/v1/products', { params });
 *
 * @param pagination - Pagination and filter options.
 * @param extra - Additional key/value pairs to append (e.g. category, status).
 * @returns An immutable HttpParams instance ready for use in HttpClient calls.
 */
export function buildPaginationParams(
  pagination: PaginationParams,
  extra: Record<string, string | number | boolean | undefined> = {},
): HttpParams {
  let params = new HttpParams()
    .set('page', String(pagination.page))
    .set('size', String(pagination.size));

  if (pagination.sort) {
    params = params.set('sort', pagination.sort);
    params = params.set('direction', pagination.direction ?? 'asc');
  }

  if (pagination.search && pagination.search.trim() !== '') {
    params = params.set('search', pagination.search.trim());
  }

  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  }

  return params;
}
