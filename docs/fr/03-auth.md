# Authentification et contrôle d'accès (RBAC)

L'authentification utilise des JWT (JSON Web Tokens). Le backend émet un token à la
connexion ; le frontend le stocke, l'attache à chaque requête API, et lit les rôles
et permissions de l'utilisateur directement dans le payload du token -- sans appel
API séparé à chaque navigation.

---

## Comment fonctionne l'authentification JWT

1. L'utilisateur soumet email et mot de passe sur la page de connexion.
2. Le backend vérifie les identifiants et retourne un objet `{ token }`.
3. Le frontend stocke le token dans `localStorage`.
4. Pour chaque requête suivante vers `/api/v1`, le frontend ajoute l'en-tête
   `Authorization: Bearer <token>`.
5. Le backend valide le token à chaque requête et lit l'identité et les rôles
   depuis celui-ci.
6. Le token dure 1 heure. Il n'y a pas d'endpoint de rafraîchissement. À
   l'expiration, l'utilisateur doit se reconnecter.

Le payload du token (la partie centrale d'un JWT, encodée en base64url) contient
l'email de l'utilisateur (`sub`), ses rôles, permissions, `iat`, `exp` et `jti`.
`jwt.ts` décode ce payload sans vérifier la signature -- la vérification de
signature est la responsabilité du backend.

---

## Stockage du token (`jwt.ts` et `auth.ts`)

`jwt.ts` est un utilitaire pur : il décode le payload base64url et retourne les
claims typés. `auth.ts` lit et écrit le token dans `localStorage` et expose les
claims décodés comme signals.

```typescript
// Conceptuellement, auth.ts fait ceci :
getToken()     -> string | null    // lit localStorage
setToken(t)                        // écrit dans localStorage
clearTokens()                      // supprime (appelé à la déconnexion)
decodeJwt(t)   -> JwtClaims       // délègue à jwt.ts
isTokenValid() -> boolean          // vérifie exp > maintenant
```

> **Pourquoi localStorage ?** `sessionStorage` déconnecterait l'utilisateur à
> chaque fermeture d'onglet. Un cookie `HttpOnly` serait plus sécurisé contre le
> XSS mais nécessiterait des en-têtes CORS sur le backend. Pour un tutoriel qui
> tourne localement, localStorage maintient l'implémentation visible et simple.

---

## Les signals de session (`auth.ts`)

`auth.ts` est la source unique de vérité pour la session. Il expose des signals que
les guards, directives et composants consomment :

```typescript
isAuthenticated  // true quand un token valide et non expiré est présent
currentUser      // { id, first_name, last_name, email, enabled, account_locked }
isAdmin          // true quand l'utilisateur a le rôle ADMIN
roles            // string[] -- noms de rôles depuis les claims JWT
permissions      // string[] -- chaînes RESOURCE:ACTION depuis les claims JWT
```

**Pourquoi des signals ?** Les signals Angular sont synchrones et réactifs. Un
composant ou guard qui lit `auth.isAuthenticated()` dans un template se re-rendera
automatiquement quand la valeur change (après connexion ou déconnexion) sans
`AsyncPipe` ni gestion manuelle d'abonnements.

---

## Restauration de session au démarrage

Quand l'utilisateur recharge la page, Angular repart de zéro. Sans traitement
spécial, l'app afficherait brièvement la page de connexion avant que le guard ait
eu la chance de vérifier le token stocké.

`app.config.ts` enregistre un initialiseur d'application :

```typescript
provideAppInitializer(() => {
  const auth = inject(Auth);
  return () => auth.restoreSession();
})
```

Angular exécute chaque initialiseur et attend leur complétion avant de traiter toute
route. `restoreSession()` lit le token depuis `localStorage`, vérifie son expiration,
décode les claims, et appelle `GET /api/v1/auth/me` pour charger l'utilisateur
courant. Au moment où le router évalue `authGuard`, les signals reflètent déjà
l'état réel de la session.

---

## L'intercepteur d'authentification

`auth-interceptor.ts` ajoute `Authorization: Bearer <token>` aux requêtes dont
l'URL commence par `environment.apiUrl` (`/api/v1`), et seulement quand un token
valide existe.

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  if (!auth.isTokenValid()) return next(req);
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${auth.getToken()}` },
  }));
};
```

La vérification de l'URL de base empêche le token de fuiter vers des requêtes
tierces si l'app appelle un jour une API externe.

---

## Les guards de route

Trois guards protègent les routes qui requièrent une authentification ou un rôle ou
permission spécifique.

### authGuard

Redirige vers `/login` (avec un paramètre de requête `returnUrl`) si
`auth.isAuthenticated()` retourne false. Appliqué à la route parente qui englobe
toutes les pages protégées dans `app.routes.ts`.

### roleGuard

Lit `data: { roles: ['ADMIN'] }` depuis la route. Si l'utilisateur n'a aucun des
rôles requis, il redirige vers `/not-allowed`. Appliqué à la route parente qui
englobe `/users`, `/roles` et `/permissions`.

### permissionGuard

Même pattern que `roleGuard`, mais vérifie `data: { permissions: ['PRODUCT:READ'] }`.
Utilisé pour le contrôle d'accès fin sur des routes individuelles.

```typescript
// app.routes.ts (simplifié)
{
  path: '',
  canActivate: [authGuard],      // doit être connecté
  children: [
    { path: 'categories', loadChildren: () => ... },
    {
      path: '',
      canActivate: [roleGuard],  // doit aussi être ADMIN
      data: { roles: ['ADMIN'] },
      children: [
        { path: 'users',       loadChildren: () => ... },
        { path: 'roles',       loadChildren: () => ... },
        { path: 'permissions', loadComponent: () => ... },
      ],
    },
  ],
},
```

---

## Directives de visibilité dans les templates

Pour les éléments UI qui ne doivent apparaître qu'aux admins (boutons Nouveau,
Supprimer, Modifier), utilisez les directives structurelles `appHasRole` et
`appHasPermission` :

```html
<!-- Afficher uniquement aux utilisateurs avec le rôle ADMIN -->
<button *appHasRole="'ADMIN'" mat-flat-button (click)="openCreate()">
  Nouvelle catégorie
</button>

<!-- Afficher uniquement aux utilisateurs avec une permission spécifique -->
<button *appHasPermission="'PRODUCT:DELETE'" mat-icon-button (click)="delete(row)">
  <mat-icon>delete</mat-icon>
</button>
```

Ces directives lisent les signals de session et ajoutent ou retirent l'élément du
DOM. Elles ne font pas d'appels API. Comme les signals sont calculés à partir des
claims JWT, ils se mettent à jour immédiatement à la connexion ou déconnexion.

---

## Flux de réinitialisation du mot de passe

1. L'utilisateur clique "Mot de passe oublié" et soumet son email.
2. Le backend envoie un email de réinitialisation (l'UI affiche toujours le même
   message neutre de confirmation, peu importe si l'email existe, pour éviter
   l'énumération d'utilisateurs).
3. L'utilisateur clique le lien dans l'email, qui contient un token de
   réinitialisation.
4. Le frontend lit le token depuis le paramètre de requête URL et affiche un
   formulaire "nouveau mot de passe".
5. À la soumission, `POST /api/v1/auth/reset-password` consomme le token et
   définit le nouveau mot de passe.
6. En cas de succès, l'utilisateur est redirigé vers `/login`.
