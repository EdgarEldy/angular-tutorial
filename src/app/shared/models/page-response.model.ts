/**
 * Paginated list wrapper returned by collection endpoints.
 *
 * Pagination is 0-based on both sides: Angular Material's MatPaginator uses
 * pageIndex (0-based) and the backend expects page (0-based). Pass them through
 * directly without any offset adjustment.
 *
 * Roles and permissions endpoints return plain arrays, not PageResponse.
 *
 * @template T - the type of each item in the list
 */
export interface PageResponse<T> {
  /** Items on the current page. */
  content: T[];
  /** Current page index (0-based). */
  page: number;
  /** Number of items per page. */
  size: number;
  /** Total number of items across all pages. */
  totalElements: number;
  /** Total number of pages. */
  totalPages: number;
}
