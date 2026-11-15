# HTTP et REST

Ce projet utilise le `HttpClient` intégré d'Angular pour appeler une API REST Spring
Boot. Ce document explique les patterns que la base de code suit pour chaque appel
HTTP : comment les requêtes sont construites, comment les réponses sont
désencapsulées, comment les paramètres de requête sont construits, et comment la
chaîne d'intercepteurs fonctionne.

---

## L'enveloppe API

Chaque réponse du backend est encapsulée dans un `ApiResponse<T>` :

```typescript
interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  timestamp: string;
}
```

Les listes paginées ajoutent une couche supplémentaire :

```typescript
interface PageResponse<T> {
  content:       T[];
  page:          number;   // base 0
  size:          number;
  totalElements: number;
  totalPages:    number;
}
```

Le service désencapsule les deux couches avant que les données n'atteignent un
composant :

```typescript
getCategories(page: number, size: number): Observable<PageResponse<CategoryResponse>> {
  return this.http
    .get<ApiResponse<PageResponse<CategoryResponse>>>(`${this.apiUrl}/categories`, {
      params: new HttpParams().set('page', page).set('size', size),
    })
    .pipe(map(res => res.data));
}
```

Les composants reçoivent `PageResponse<CategoryResponse>` -- ils ne voient jamais
`ApiResponse`.

---

## HttpParams et paramètres de requête

`HttpParams` est immutable. Chaque appel à `.set()` ou `.append()` retourne une
nouvelle instance ; il ne modifie pas l'instance existante. Construisez les params
étape par étape :

```typescript
// HttpParams est immutable ; chaque set() retourne une nouvelle instance
let params = new HttpParams()
  .set('page', page)
  .set('size', size);

// N'ajoutez les filtres optionnels que s'ils ont une valeur
if (categoryId) params = params.set('categoryId', categoryId);
if (productName) params = params.set('productName', productName);
if (minPrice != null) params = params.set('minPrice', minPrice);
if (maxPrice != null) params = params.set('maxPrice', maxPrice);
```

**N'envoyez jamais de paramètres vides.** Un filtre absent et un filtre chaîne vide
ont des significations différentes pour le backend. Utilisez le pattern conditionnel
ci-dessus pour omettre tout filtre non rempli par l'utilisateur.

---

## Pagination

Le backend utilise une pagination base 0. Le `MatPaginator` d'Angular Material
utilise aussi un `pageIndex` base 0. Passez `pageIndex` comme `page` et `pageSize`
comme `size` directement.

Le helper de pagination partagé dans `src/app/shared/pagination/` traduit un
événement `MatPaginator` (qui transporte aussi la sortie de `MatSort`) en un objet
`HttpParams`. Chaque page de liste utilise ce helper plutôt que de construire les
params manuellement.

Le tri est passé comme `sort=nomChamp,asc` ou `sort=nomChamp,desc` :

```typescript
params = params.set('sort', `${sort.active},${sort.direction}`);
```

---

## Deux intercepteurs

Deux intercepteurs fonctionnels sont enregistrés dans `app.config.ts` :

```typescript
provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
```

Ils s'exécutent dans l'ordre indiqué. `authInterceptor` s'exécute en premier, puis
`errorInterceptor`.

### authInterceptor

Ajoute `Authorization: Bearer <token>` à chaque requête dont l'URL commence par
`environment.apiUrl` (`/api/v1`), mais seulement quand un token valide et non expiré
existe. N'envoie jamais le token à d'autres hôtes (pas de fuite du token vers des
appels tiers).

### errorInterceptor

Intercepte chaque `HttpErrorResponse` et la convertit en `AppError` via
`error-mapper.ts`. Le composant qui a appelé le service ne reçoit jamais de
`HttpErrorResponse` brute ; il reçoit toujours un `AppError` typé avec un `kind`,
un `status`, un `message` et des `fieldErrors` optionnels.

---

## Les modèles reflètent le JSON exactement

Le backend utilise des noms de champs en snake_case. Les modèles du frontend
reflètent le JSON exactement, snake_case inclus :

```typescript
interface ProductResponse {
  id:            number;
  product_name:  string;
  unit_price:    number;
  category_id:   number;
  category_name: string;
}
```

Il n'y a pas de couche de mapping. Les modèles dans `features/<nom>/models/` sont
des interfaces dont les noms de propriétés correspondent aux clés JSON une à une.
Le compilateur TypeScript et l'analyseur JSON s'accordent sur la forme car les clés
sont identiques.

---

## Structure d'un service

Chaque service de fonctionnalité suit le même pattern :

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

Règles pour chaque service :
- Une méthode par endpoint.
- Retourne un `Observable<T>` typé, jamais `Observable<ApiResponse<T>>`.
- N'injecte jamais `Router`, `MatSnackBar` ni aucun service UI.
- Ne lance jamais d'exception manuellement ; laisse les erreurs se propager au
  composant.

---

## Rechargement après une mutation

Après un create, update, delete ou une assignation réussie, rechargez la liste
courante. Les deux patterns utilisés dans cette base de code sont :

**Rappeler la méthode liste :** déclenche une nouvelle requête HTTP et remplace
le signal.

```typescript
createCategory(body: CategoryRequest): void {
  this.categoriesService.createCategory(body).subscribe({
    next: () => this.loadCategories(),
    error: (err: AppError) => this.handleError(err),
  });
}
```

**Mettre à jour le signal depuis l'entité retournée :** évite un aller-retour
quand le backend retourne directement l'objet mis à jour.

```typescript
updateCategory(id: number, body: CategoryRequest): void {
  this.categoriesService.updateCategory(id, body).subscribe({
    next: updated => this.items.update(list =>
      list.map(c => c.id === updated.id ? updated : c)
    ),
    error: (err: AppError) => this.handleError(err),
  });
}
```
