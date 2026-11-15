# Branche : feature/core-architecture

Cette branche met en place tout ce dont les branches de fonctionnalités suivantes
dépendent : la couche HTTP, les intercepteurs, l'infrastructure de gestion des
erreurs, le shell de mise en page, et les composants UI partagés.

---

## Objectifs pédagogiques

Après avoir étudié cette branche, vous comprendrez :

- Comment enregistrer des intercepteurs fonctionnels avec
  `provideHttpClient(withInterceptors)`
- Comment `errorInterceptor` convertit `HttpErrorResponse` en `AppError`
- Comment restaurer une session au démarrage avec `provideAppInitializer`
- Comment est structuré le shell de mise en page (sidenav + barre d'outils)
- Comment construire un helper de pagination partagé pour le `MatPaginator` de
  Material
- Comment conteneuriser une application Angular avec un Dockerfile multi-étapes

---

## Couche HTTP

Les deux intercepteurs sont enregistrés dans `app.config.ts` :

```typescript
provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
```

`authInterceptor` s'exécute en premier (ajoute le token), puis `errorInterceptor`
(convertit les erreurs). Cet ordre est important : l'intercepteur d'auth doit
s'exécuter avant que la réponse ne soit observée par l'intercepteur d'erreur.

Le mappeur d'erreurs (`error-mapper.ts`) est une fonction pure. Il convertit un
`HttpErrorResponse` en `AppError` en lisant le statut HTTP et, quand il est
présent, le corps `ApiResponse<ProblemDetail>`. Les fonctions pures sont plus
faciles à tester : les tests unitaires d'error-mapper couvrent chaque code de
statut sans `TestBed`.

---

## Modèles partagés

Trois interfaces dans `shared/models/` sont utilisées par chaque service :

| Interface | Fichier | Rôle |
|---|---|---|
| `ApiResponse<T>` | `api-response.model.ts` | Encapsule chaque réponse backend |
| `PageResponse<T>` | `page-response.model.ts` | Corps d'une liste paginée |
| `ProblemDetail` | `problem-detail.model.ts` | Détail d'erreur RFC 7807 |

---

## Shell de mise en page

`core/layout/shell/shell.ts` affiche le cadre de l'application : une barre d'outils
Material en haut et une sidenav à gauche avec des liens de navigation. La zone de
contenu principale est un `<router-outlet>`.

La sidenav n'affiche la section "Administration" qu'aux admins :

```html
@if (auth.isAdmin()) {
  <mat-nav-list>
    <a mat-list-item routerLink="/users">Utilisateurs</a>
    <a mat-list-item routerLink="/roles">Rôles</a>
    <a mat-list-item routerLink="/permissions">Permissions</a>
  </mat-nav-list>
}
```

Cela utilise le signal `auth.isAdmin()` depuis `Auth`. La sidenav se met à jour
automatiquement à la connexion ou déconnexion.

---

## Composants UI partagés

| Composant | Rôle |
|---|---|
| `app-loading` | Spinner affiché pendant le chargement des données |
| `app-error-banner` | État d'erreur avec un bouton Réessayer |
| `app-empty-state` | Placeholder pour liste vide ou détail vide |
| `app-page-header` | Titre de page cohérent + ligne de bouton d'action |
| `app-confirm-dialog` | Confirmation générique pour suppression / action destructive |

Chaque page de liste utilise ces trois composants pour les états loading, error et
empty.

---

## Helper de pagination

`shared/pagination/` exporte une fonction qui convertit les événements `MatPaginator`
et `MatSort` en `HttpParams` :

```typescript
// Convertit pageIndex, pageSize et sort en page, size, sort=champ,direction
buildPaginationParams(paginator: MatPaginator, sort?: MatSort): HttpParams
```

Chaque page de liste importe ce helper pour que la pagination ne soit jamais
implémentée deux fois.

---

## MoneyPipe

`shared/pipes/money.pipe.ts` formate un nombre en chaîne de devise localisée. Il
utilise le `CurrencyPipe` d'Angular en interne et applique le code devise par défaut
du projet. Utilisez-le dans chaque template qui affiche `unit_price` ou `total` :

```html
{{ product.unit_price | money }}
```

---

## Docker et CI

Le `Dockerfile` utilise un build en deux étapes :
1. Node 22 Alpine installe les dépendances et exécute `npm run build`.
2. nginx 1.27 Alpine sert le dossier `dist/` compilé.

`nginx.conf` proxifie `/api/v1` vers `host.docker.internal:8080` pour que le
conteneur puisse atteindre le backend sur la machine hôte.

`.github/workflows/ci.yml` exécute lint, test et build à chaque push sur `develop`
et `master`. Le build doit passer avant qu'une PR puisse être mergée.

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `app.config.ts` | Providers globaux incluant intercepteurs et initialiseur d'app |
| `app.routes.ts` | Routes lazy de haut niveau |
| `core/http/error-mapper.ts` | Conversion status -> AppError |
| `core/http/error-interceptor.ts` | Applique error-mapper à chaque réponse |
| `core/auth/auth-interceptor.ts` | Ajoute le token Bearer aux requêtes API |
| `core/layout/shell/shell.ts` | Barre d'outils + mise en page sidenav |
| `shared/pagination/` | Adaptateur Material paginator -> HttpParams |
| `shared/pipes/money.pipe.ts` | Formateur de devise |
| `Dockerfile` | Image de production multi-étapes |
| `.github/workflows/ci.yml` | Pipeline CI lint + test + build |
