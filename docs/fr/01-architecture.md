# Vue d'ensemble de l'architecture

Ce document explique comment l'application est structurée et pourquoi elle l'est
ainsi. Lisez-le avant d'étudier n'importe quelle branche : les patterns décrits
ici se répètent dans chaque fonctionnalité.

---

## Flux d'une requête

```
Navigateur
  |
  v
Composant (page ou dialog)
  |  appelle une méthode sur
  v
Service de fonctionnalité (ex. CategoriesService)
  |  appelle HttpClient
  v
authInterceptor      -- ajoute Authorization: Bearer <token>
  |
  v
errorInterceptor     -- convertit HttpErrorResponse -> AppError
  |
  v
Backend (Spring Boot, /api/v1)
```

Les deux intercepteurs sont enregistrés globalement dans `app.config.ts` avec
`provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`. Chaque
appel HTTP de l'application passe par les deux, dans cet ordre. Les composants ne
voient jamais `HttpErrorResponse` ; ils reçoivent toujours un résultat typé ou un
`AppError`.

---

## Structure des dossiers

```
src/app/
  app.ts                     Composant racine (le shell est dans core/layout/shell)
  app.config.ts              Providers globaux (router, HttpClient, intercepteurs, AppInitializer)
  app.routes.ts              Routes de haut niveau (lazy-load de chaque fonctionnalité)
  core/
    auth/
      auth.ts                Signals de session, stockage du token, register/login/logout
      jwt.ts                 Décode le payload JWT (sans vérification de signature)
      auth-guard.ts          Exige une session valide
      role-guard.ts          Exige un rôle spécifique (depuis les données de route)
      permission-guard.ts    Exige une permission spécifique (depuis les données de route)
      has-permission.ts      Directive structurelle : afficher/masquer par rôle ou permission
      auth-interceptor.ts    Ajoute le token Bearer aux requêtes /api/v1
    http/
      error-interceptor.ts   HttpErrorResponse -> AppError
      app-error.model.ts     Type AppError
      error-mapper.ts        status + ProblemDetail -> AppError
    notification/
      notification.ts        Wrapper MatSnackBar
    layout/
      shell/                 Barre d'outils, sidenav, router-outlet
  shared/
    models/                  ApiResponse, PageResponse, ProblemDetail
    ui/                      confirm-dialog, page-header, empty-state, loading, error-banner
    pagination/              Adaptateur Material paginator -> page/size/sort
    pipes/
      money.pipe.ts          Formate unit_price et total en devise localisée
  features/
    auth/                    Login, register, activate, forgot-password, reset-password, profil
    users/                   Gestion users : liste, verrouillage, assignation rôles (ADMIN)
    roles/                   Gestion rôles : liste, assignation permissions (ADMIN)
    permissions/             Gestion permissions : liste, créer, supprimer (ADMIN)
    categories/              Liste, détail, CRUD catégories
    products/                Liste avec filtres, CRUD produits
    customers/               Liste, détail, commandes, CRUD clients
    orders/                  Liste, détail, CRUD commandes
```

---

## Décisions d'architecture clés

### Séparation smart / dumb

Les composants pages (dans `pages/`) récupèrent les données, maintiennent les
signals loading/error, et orchestrent les actions. Les composants de présentation
(dans `components/`) reçoivent des signals `input()` typés et émettent des
`output()`. Cette séparation rend les composants de présentation réutilisables et
faciles à tester : vous leur passez des données, vous observez ce qu'ils émettent.

### Les services possèdent la couche HTTP

Les services de fonctionnalité (ex. `categories.ts`, `products.ts`) sont le seul
code qui injecte `HttpClient`. Ils désencapsulent le `ApiResponse<T>` et retournent
le `data` typé comme `Observable<T>`. Les composants appellent les méthodes du
service ; ils ne construisent jamais d'URLs ni n'analysent de réponses.

### Session au démarrage avec provideAppInitializer

`app.config.ts` enregistre un initialiseur d'application :

```typescript
provideAppInitializer(() => {
  const auth = inject(Auth);
  return () => auth.restoreSession();
})
```

Angular exécute chaque initialiseur et attend leur complétion avant d'évaluer toute
route. `restoreSession()` lit le token depuis `localStorage`, valide son expiration,
décode les claims et charge l'utilisateur courant depuis le backend. Au moment où un
guard s'exécute, le signal `isAuthenticated` reflète déjà l'état réel.

Sans cela, l'app afficherait brièvement la page de connexion à chaque rechargement
dur, même quand un token valide est stocké.

### Lazy loading

Chaque dossier de fonctionnalité expose un fichier `*.routes.ts`. `app.routes.ts`
charge les fonctionnalités avec `loadChildren(() => import('./features/xxx/xxx.routes'))`.
Le router ne télécharge que le bundle de la fonctionnalité vers laquelle l'utilisateur
navigue, ce qui réduit le chargement initial.

### Un seul service par ressource

Tous les endpoints sont sous `/api/v1` (un seul backend). Le service lit
`environment.apiUrl` pour chaque appel. Si le backend est un jour divisé, seul le
fichier d'environnement change.

### Signals pour l'état local et l'affichage

Chaque page maintient son état avec des signals (`signal()`, `computed()`,
`linkedSignal()`). Les composants utilisent `ChangeDetectionStrategy.OnPush`, donc
Angular ne re-rend que lorsqu'une valeur de signal change réellement. Pas de Zone.js,
pas d'appels manuels de détection des changements.
