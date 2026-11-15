# Testing

The project uses Vitest as the test runner (via `ng test`). Tests are co-located
with their source files (`*.spec.ts`) and use Angular's `TestBed` for dependency
injection. No real backend is needed.

---

## Testing services with HttpTestingController

Feature services use `HttpClient`. In tests, replace `HttpClient` with the testing
double that Angular provides:

```typescript
TestBed.configureTestingModule({
  providers: [
    CategoriesService,
    provideHttpClient(),
    provideHttpClientTesting(),
  ],
});

const service    = TestBed.inject(CategoriesService);
const httpMock   = TestBed.inject(HttpTestingController);
```

`HttpTestingController` lets you intercept outgoing requests and respond to them
with controlled data:

```typescript
it('should return a paginated list of categories', (done) => {
  service.getCategories(0, 10).subscribe(result => {
    expect(result.content).toHaveLength(2);
    done();
  });

  const req = httpMock.expectOne(r => r.url.includes('/categories'));
  expect(req.request.method).toBe('GET');
  req.flush({
    success: true,
    message: 'OK',
    data: {
      content: [
        { id: 1, category_name: 'Drinks' },
        { id: 2, category_name: 'Food' },
      ],
      totalElements: 2,
      totalPages: 1,
      page: 0,
      size: 10,
    },
  });

  httpMock.verify(); // ensure no unexpected requests were made
});
```

Cover at minimum:
1. **Happy path:** the service sends the right method, URL and query params, and
   returns the unwrapped `data`.
2. **Error path:** the server responds with an error status; the observable emits
   an `AppError` with the right `kind`.

---

## Testing the error mapper

`error-mapper.ts` has unit tests covering every `ErrorKind`. These are plain
function tests (no `TestBed` needed):

```typescript
describe('mapToAppError', () => {
  it('maps 400 to VALIDATION', () => {
    const response = new HttpErrorResponse({
      status: 400,
      error: { success: false, message: 'Validation failed',
               data: { fieldErrors: { product_name: 'required' } } },
    });
    const error = mapToAppError(response);
    expect(error.kind).toBe('VALIDATION');
    expect(error.fieldErrors?.['product_name']).toBe('required');
  });

  it('maps 0 to NETWORK', () => {
    const response = new HttpErrorResponse({ status: 0 });
    expect(mapToAppError(response).kind).toBe('NETWORK');
  });
});
```

Write one test per status code. These run in milliseconds and catch regressions
when the backend changes its error format.

---

## Testing guards

Guards are functions. Test them with `TestBed` and a mock `Auth` service:

```typescript
describe('authGuard', () => {
  it('redirects to /login when not authenticated', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'categories', component: CategoryListPage }]),
        { provide: Auth, useValue: { isAuthenticated: signal(false) } },
      ],
    });
    const router = TestBed.inject(Router);
    TestBed.runInInjectionContext(() => {
      const result = authGuard(mockRoute, mockState('/categories'));
      expect(result).toEqual(
        router.createUrlTree(['/login'], { queryParams: { returnUrl: '/categories' } })
      );
    });
  });
});
```

---

## Testing components

Component tests use `TestBed` with Angular Material harnesses. Harnesses interact
with components through their public API (labels, buttons, form fields) rather than
DOM selectors that break on refactoring.

```typescript
it('should disable submit while request is in flight', async () => {
  const fixture = TestBed.createComponent(CategoryFormDialog);
  const harness = await TestbedHarnessEnvironment.harnessForFixture(
    fixture, MatDialogHarness
  );

  fixture.componentInstance.saving.set(true);
  fixture.detectChanges();

  const button = await harness.getButtonWithText('Save');
  expect(await button.isDisabled()).toBe(true);
});
```

For dialogs, provide `MAT_DIALOG_DATA` with mock data to simulate the edit case:

```typescript
providers: [
  { provide: MAT_DIALOG_DATA, useValue: { id: 1, category_name: 'Drinks' } },
  { provide: MatDialogRef,     useValue: { close: jest.fn() } },
]
```

---

## Testing interceptors

Test `authInterceptor` with `provideHttpClientTesting` and verify that the
`Authorization` header is added only when a valid token exists and only to requests
to `environment.apiUrl`:

```typescript
it('should add Bearer token to /api/v1 requests', () => {
  // Provide auth with a valid token
  // Make a request to /api/v1/categories
  // Expect the outgoing request to have the Authorization header
});

it('should NOT add token to external requests', () => {
  // Make a request to https://example.com
  // Expect no Authorization header
});
```

---

## Running the tests

```bash
npm test               # run all tests once
npm test -- --watch    # watch mode (re-runs on save)
```

A clean run shows no failures. Fix every failing test before opening a pull request.
