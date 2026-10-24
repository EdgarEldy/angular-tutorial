/**
 * Generic response envelope returned by both the identity and business APIs.
 *
 * Every endpoint wraps its payload in this structure. Services must unwrap
 * the data field before returning to components:
 *   http.get<ApiResponse<T>>(url).pipe(map(res => res.data))
 *
 * On error, success is false, message carries the human-readable reason, and
 * data holds a ProblemDetail (with optional fieldErrors for 400s).
 *
 * @template T - the type of the data payload
 */
export interface ApiResponse<T> {
  /** Whether the operation succeeded. */
  success: boolean;
  /** Human-readable message from the server (used for errors and confirmations). */
  message: string;
  /** The actual payload; null on error. */
  data: T;
  /** ISO 8601 timestamp of the response. */
  timestamp: string;
}
