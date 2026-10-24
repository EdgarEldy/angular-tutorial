/**
 * RFC 7807 Problem Details object returned in the data field of error responses.
 *
 * The backends return this inside ApiResponse.data when success is false.
 * The errorInterceptor and error-mapper extract the relevant fields.
 *
 * fieldErrors is present only on 400 validation errors: keys are the JSON
 * field names (may be camelCase from Java or snake_case from the JSON mapping)
 * and values are the validation messages for that field.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7807
 */
export interface ProblemDetail {
  /** A URI identifying the problem type (optional). */
  type?: string;
  /** Short human-readable title of the problem. */
  title: string;
  /** HTTP status code. */
  status: number;
  /** Human-readable explanation of this specific occurrence. */
  detail: string;
  /** The URI of the specific resource that caused the problem. */
  instance: string;
  /** Per-field validation messages; present only on 400 errors. */
  fieldErrors?: Record<string, string>;
}
