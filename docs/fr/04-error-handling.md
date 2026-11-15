# Gestion des erreurs

Chaque erreur HTTP dans l'application est convertie en un `AppError` typé par
`errorInterceptor`. Les composants ne voient jamais de `HttpErrorResponse` brute ;
ils reçoivent toujours une erreur structurée avec un `kind` qui indique ce qui
s'est passé et quelle UI afficher.

---

## Le type AppError

```typescript
interface AppError {
  kind:        ErrorKind;
  status:      number;
  message:     string;
  fieldErrors?: Record<string, string>;
}

type ErrorKind =
  | 'VALIDATION'      // 400 -- entrée invalide ou token expiré
  | 'UNAUTHENTICATED' // 401 -- token manquant, expiré ou blacklisté
  | 'FORBIDDEN'       // 403 -- authentifié mais non autorisé
  | 'NOT_FOUND'       // 404 -- la ressource n'existe pas
  | 'CONFLICT'        // 409 -- violation de verrou optimiste
  | 'BUSINESS_RULE'   // 422 -- violation d'une règle du domaine
  | 'SERVER'          // 5xx -- erreur serveur inattendue
  | 'NETWORK';        // 0   -- impossible d'atteindre le serveur
```

---

## Le mappeur d'erreurs (`error-mapper.ts`)

`error-mapper.ts` convertit un statut HTTP brut et un corps en `AppError`. Le
backend encapsule les erreurs dans un `ApiResponse<ProblemDetail>` :

```typescript
// Ce que le backend envoie en cas d'erreur
interface ProblemDetail {
  title:       string;
  status:      number;
  detail:      string;
  instance:    string;
  fieldErrors?: Record<string, string>;  // uniquement sur 400
}
```

Le mappeur lit le `message` depuis `ApiResponse` (le résumé lisible) et se rabat
sur `ProblemDetail.detail` si le message externe est absent :

| Statut HTTP | ErrorKind |
|---|---|
| 400 | `VALIDATION` (fieldErrors renseignés quand présents) |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 422 | `BUSINESS_RULE` |
| 5xx | `SERVER` |
| 0 (pas de connexion) | `NETWORK` |

Le mappeur est tolérant : il gère les corps absents ou de forme différente (par
exemple, les 401 et 403 de Spring Security arrivent souvent sans corps JSON du
tout) et produit toujours un `AppError` valide.

---

## L'intercepteur d'erreur

`error-interceptor.ts` se trouve en fin de chaîne d'intercepteurs. Il intercepte
chaque `HttpErrorResponse` et la convertit :

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => throwError(() => mapToAppError(err)))
  );
```

Après cet intercepteur, seuls des `AppError` typés se propagent comme erreurs.
Les services n'ont pas besoin d'un `catchError` sauf s'ils veulent ajouter une
logique spécifique à la ressource.

---

## Comportement par type d'erreur

Chaque `ErrorKind` a une réponse UI standard. Cette cohérence est importante : un
étudiant doit toujours savoir ce qui se passe quand un 403 arrive, quel que soit
l'écran actif.

| Type | Comportement UI |
|---|---|
| `VALIDATION` | Mapper `fieldErrors` sur les contrôles de formulaire ; afficher le message restant en ligne |
| `UNAUTHENTICATED` | Vider la session, rediriger vers `/login` avec `returnUrl` |
| `FORBIDDEN` | Afficher une snackbar avec le message backend |
| `NOT_FOUND` | Afficher la bannière d'erreur avec retry sur les pages de détail |
| `CONFLICT` | Afficher le message backend en ligne dans le dialog, garder le dialog ouvert, proposer de recharger |
| `BUSINESS_RULE` | Afficher le message backend en ligne dans le dialog, garder le dialog ouvert |
| `SERVER` | Afficher la bannière d'erreur avec retry |
| `NETWORK` | Afficher la bannière d'erreur avec retry |

**Exception :** un 401 de `POST /api/v1/auth/login` signifie des identifiants
incorrects ou un compte verrouillé. Le service détecte ce cas (en vérifiant l'URL
de la requête avant la redirection) et affiche le message en ligne sur le formulaire
de connexion au lieu de rediriger.

---

## Le pattern des trois états

Chaque page de liste ou de détail a exactement trois états explicites. Avec les
signals Angular :

```typescript
loading = signal(false);
error   = signal<AppError | null>(null);
items   = signal<CategoryResponse[]>([]);
```

Le template utilise `@if` pour afficher le bon état :

```html
@if (loading()) {
  <app-loading />
} @else if (error()) {
  <app-error-banner [error]="error()!" (retry)="load()" />
} @else if (items().length === 0) {
  <app-empty-state message="Aucune catégorie trouvée." />
} @else {
  <!-- tableau de données -->
}
```

Ce pattern élimine l'erreur courante d'afficher un écran blanc quand une requête
échoue ou ne retourne aucun résultat. Chaque écran a un état explicite pour chaque
issue possible.

---

## Erreurs de validation et contrôles de formulaire

Quand le backend retourne `400` avec `fieldErrors`, mappez chaque entrée sur le
contrôle de formulaire avec le nom correspondant :

```typescript
error: (err: AppError) => {
  if (err.kind === 'VALIDATION' && err.fieldErrors) {
    Object.entries(err.fieldErrors).forEach(([field, msg]) => {
      this.form.get(field)?.setErrors({ server: msg });
    });
  }
  this.formError.set(err.message);
}
```

Le backend peut utiliser le nom de propriété Java (camelCase) ou le nom JSON
snake_case comme clé. `error-mapper.ts` normalise les variantes courantes, mais
les contrôles de formulaire de ce projet utilisent les mêmes noms snake_case que
les modèles JSON, donc le mapping fonctionne directement.
