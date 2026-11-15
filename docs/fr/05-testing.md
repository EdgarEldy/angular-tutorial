# Tests

Le projet utilise Vitest comme exécuteur de tests (via `ng test`). Les tests sont
co-localisés avec leurs fichiers sources (`*.spec.ts`) et utilisent le `TestBed`
d'Angular pour l'injection de dépendances. Aucun vrai backend n'est requis.

---

## Tester les services avec HttpTestingController

Les services de fonctionnalité utilisent `HttpClient`. Dans les tests, remplacez
`HttpClient` par le double de test fourni par Angular :

```typescript
TestBed.configureTestingModule({
  providers: [
    CategoriesService,
    provideHttpClient(),
    provideHttpClientTesting(),
  ],
});

const service  = TestBed.inject(CategoriesService);
const httpMock = TestBed.inject(HttpTestingController);
```

`HttpTestingController` vous permet d'intercepter les requêtes sortantes et d'y
répondre avec des données contrôlées :

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
        { id: 1, category_name: 'Boissons' },
        { id: 2, category_name: 'Nourriture' },
      ],
      totalElements: 2,
      totalPages: 1,
      page: 0,
      size: 10,
    },
  });

  httpMock.verify(); // vérifie qu'aucune requête inattendue n'a été faite
});
```

Couvrez au minimum :
1. **Happy path :** le service envoie la bonne méthode, URL et paramètres de
   requête, et retourne le `data` désencapsulé.
2. **Error path :** le serveur répond avec un statut d'erreur ; l'observable émet
   un `AppError` avec le bon `kind`.

---

## Tester le mappeur d'erreurs

`error-mapper.ts` a des tests unitaires couvrant chaque `ErrorKind`. Ce sont des
tests de fonctions pures (pas de `TestBed` nécessaire) :

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

Écrivez un test par code de statut. Ces tests s'exécutent en quelques millisecondes
et détectent les régressions quand le backend change son format d'erreur.

---

## Tester les guards

Les guards sont des fonctions. Testez-les avec `TestBed` et un mock d'`Auth` :

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

## Tester les composants

Les tests de composants utilisent `TestBed` avec les harnais Angular Material. Les
harnais interagissent avec les composants via leur API publique (libellés, boutons,
champs de formulaire) plutôt que des sélecteurs DOM qui se cassent lors des
refactorisations.

```typescript
it('should disable submit while request is in flight', async () => {
  const fixture = TestBed.createComponent(CategoryFormDialog);
  const harness = await TestbedHarnessEnvironment.harnessForFixture(
    fixture, MatDialogHarness
  );

  fixture.componentInstance.saving.set(true);
  fixture.detectChanges();

  const button = await harness.getButtonWithText('Enregistrer');
  expect(await button.isDisabled()).toBe(true);
});
```

Pour les dialogs, fournissez `MAT_DIALOG_DATA` avec des données mock pour simuler
le cas modification :

```typescript
providers: [
  { provide: MAT_DIALOG_DATA, useValue: { id: 1, category_name: 'Boissons' } },
  { provide: MatDialogRef,     useValue: { close: jest.fn() } },
]
```

---

## Tester les intercepteurs

Testez `authInterceptor` avec `provideHttpClientTesting` et vérifiez que l'en-tête
`Authorization` n'est ajouté que quand un token valide existe et seulement sur les
requêtes vers `environment.apiUrl` :

```typescript
it('should add Bearer token to /api/v1 requests', () => {
  // Fournissez auth avec un token valide
  // Faites une requête vers /api/v1/categories
  // Vérifiez que la requête sortante a l'en-tête Authorization
});

it('should NOT add token to external requests', () => {
  // Faites une requête vers https://example.com
  // Vérifiez l'absence d'en-tête Authorization
});
```

---

## Lancer les tests

```bash
npm test               # lancer tous les tests une fois
npm test -- --watch    # mode veille (relance à chaque sauvegarde)
```

Une exécution propre ne montre aucun échec. Corrigez chaque test en échec avant
d'ouvrir une pull request.
