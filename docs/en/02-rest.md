# HTTP and REST

This project uses Angular's built-in `HttpClient` to call a Spring Boot REST API.
This document explains the patterns the codebase follows for every HTTP call:
how requests are built, how responses are unwrapped, how query parameters are
constructed, and how the interceptor chain works.

---

## The API envelope

Every response from the backend is wrapped in an `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  timestamp: string;
}
```

Paginated lists add another layer:

```typescript
interface PageResponse<T> {
  content:       T[];
  page:          number;   // 0-based
  size:          number;
  totalElements: number;
  totalPages:    number;
}
```

The service unwraps both layers before the data reaches any component:

```typescript
getCategories(page: number, size: number): Observable<PageResponse<CategoryResponse>> {
  return this.http
    .get<ApiResponse<PageResponse<CategoryResponse>>>(`${this.apiUrl}/categories`, {
      params: new HttpParams().set('page', page).set('size', size),
    })
    .pipe(map(res => res.data));
}
```

Components receive `PageResponse<CategoryResponse>` -- they never see `ApiResponse`.

---

## HttpParams and query strings

`HttpParams` is immutable. Each call to `.set()` or `.append()` returns a new
instance; it does not modify the existing one. Build the params step by step:

```typescript
// HttpParams is immutable; each set() returns a new instance
let params = new HttpParams()
  .set('page', page)
  .set('size', size);

// Add optional filters only when they have a value
if (categoryId) params = params.set('categoryId', categoryId);
if (productName) params = params.set('productName', productName);
if (minPrice != null) params = params.set('minPrice', minPrice);
if (maxPrice != null) params = params.set('maxPrice', maxPrice);
```

**Never send empty string parameters.** An absent filter and an empty-string filter
have different meanings on the backend. Use the conditional pattern above to omit
any filter the user has not filled in.

---

## Pagination

The backend uses 0-based pagination. Angular Material's `MatPaginator` also uses
0-based `pageIndex`. Pass `pageIndex` as `page` and `pageSize` as `size` directly.

The shared pagination helper in `src/app/shared/pagination/` translates a
`MatPaginator` event (which also carries `MatSort` output) into an `HttpParams`
object. Every list page uses this helper rather than building the params by hand.

Sorting is passed as `sort=fieldName,asc` or `sort=fieldName,desc`:

```typescript
params = params.set('sort', `${sort.active},${sort.direction}`);
```

---

## Two interceptors

Two functional interceptors are registered in `app.config.ts`:

```typescript
provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
```

They run in the order listed. `authInterceptor` runs first, then `errorInterceptor`.

### authInterceptor

Adds `Authorization: Bearer <token>` to every request whose URL starts with
`environment.apiUrl` (`/api/v1`), but only when a valid, non-expired token exists.
Never sends the token to other hosts (no token leakage to third-party calls).

### errorInterceptor

Catches every `HttpErrorResponse` and converts it into an `AppError` using
`error-mapper.ts`. The component that called the service never receives a raw
`HttpErrorResponse`; it always gets a typed `AppError` with a `kind`, `status`,
`message` and optional `fieldErrors`.

---

## Models mirror the JSON exactly

The backend uses snake_case field names. The frontend models mirror the JSON
exactly, snake_case included:

```typescript
interface ProductResponse {
  id:            number;
  product_name:  string;
  unit_price:    number;
  category_id:   number;
  category_name: string;
}
```

There is no mapping layer. The models in `features/<name>/models/` are interfaces
whose property names match the JSON keys one-to-one. The TypeScript compiler and
the JSON parser agree on the shape because the keys are identical.

---

## Service structure

Every feature service follows the same pattern:

```typescript
@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http    = inject(HttpClient);
  private readonly apiUrl  = `${environment.apiUrl}/categories`;

  getCategories(page: number, size: number): Observable<PageResponse<CategoryResponse>> { ... }
  getCategory(id: number): Observable<CategoryResponse> { ... }
  createCategory(body: CategoryRequest): Observable<CategoryResponse> { ... }
  updateCategory(id: number, body: CategoryRequest): Observable<CategoryResponse> { ... }
  deleteCategory(id: number): Observable<void> { ... }
}
```

Rules for every service:
- One method per endpoint.
- Returns typed `Observable<T>`, never `Observable<ApiResponse<T>>`.
- Never injects `Router`, `MatSnackBar` or any UI service.
- Never throws manually; lets errors propagate to the component.

---

## Reload after a mutation

After a successful create, update, delete, or assignment, reload the current list.
The two patterns used in this codebase are:

**Re-call the list method:** triggers a new HTTP request and replaces the signal.

```typescript
createCategory(body: CategoryRequest): void {
  this.categoriesService.createCategory(body).subscribe({
    next: () => this.loadCategories(),
    error: (err: AppError) => this.handleError(err),
  });
}
```

**Update the signal from the returned entity:** avoids a round-trip when the backend
returns the updated object directly.

```typescript
updateCategory(id: number, body: CategoryRequest): void {
  this.categoriesService.updateCategory(id, body).subscribe({
    next: updated => this.items.update(list => list.map(c => c.id === updated.id ? updated : c)),
    error: (err: AppError) => this.handleError(err),
  });
}
```
