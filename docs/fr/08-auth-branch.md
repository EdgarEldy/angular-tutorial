# Branche : feature/auth

Cette branche implémente le flux d'authentification complet : inscription avec
activation par email, connexion, déconnexion, réinitialisation du mot de passe,
gestion de session, guards de route, directives RBAC, et la page de profil.

---

## Objectifs pédagogiques

Après avoir étudié cette branche, vous comprendrez :

- Comment décoder un payload JWT sans bibliothèque tierce
- Comment les signals de session sont construits à partir des claims JWT
- Comment `provideAppInitializer` restaure une session avant la première route
- Comment les guards de route utilisent les signals pour prendre des décisions
  d'accès de manière synchrone
- Comment les directives structurelles peuvent lire des signals pour rendre
  conditionnellement des éléments DOM
- Comment gérer les flux d'activation et de réinitialisation de mot de passe par
  email

---

## Écrans publics d'authentification

| Route | Rôle |
|---|---|
| `/login` | Email + mot de passe ; stocke le token et charge `/auth/me` en cas de succès |
| `/register` | Nom + email + mot de passe ; affiche "vérifiez votre email" en cas de succès |
| `/activate-account?token=` | Lit le token depuis l'URL, appelle le backend, affiche le résultat |
| `/forgot-password` | Email seulement ; affiche toujours une confirmation neutre |
| `/reset-password?token=` | Formulaire nouveau mot de passe ; lit le token depuis l'URL |

---

## Déroulement du flux d'activation

Le flux d'activation est l'étape la plus susceptible de bloquer un étudiant au
premier démarrage.

1. Inscrivez-vous sur `/register`. Le backend envoie un email d'activation.
2. Ouvrez votre serveur mail (par ex. MailHog à `http://localhost:8025`).
3. Cliquez le lien d'activation. Il pointe vers
   `/activate-account?token=<UUID du backend>`.
4. La page lit le paramètre de requête `token` et appelle
   `GET /api/v1/auth/activate-account?token=<UUID>`.
5. En cas de succès : afficher un message de réussite avec un lien vers `/login`.
6. En cas d'erreur (token expiré, déjà utilisé) : afficher le message d'erreur
   backend sur la page (pas de redirection).

---

## Cascade des signals de session après connexion

Quand la connexion réussit, `auth.ts` appelle `setToken(token)` puis
`loadCurrentUser()`. Voici la cascade de signals qui se déclenche :

```
setToken()
  -> signal token mis à jour
  -> signal calculé claims recalcule (décode le payload JWT)
  -> signal calculé roles recalcule (depuis les claims)
  -> signal calculé permissions recalcule (depuis les claims)
  -> signal calculé isAuthenticated recalcule (token valide)
  -> signal calculé isAdmin recalcule (roles contient ADMIN)

loadCurrentUser()  (GET /auth/me)
  -> signal currentUser mis à jour (id, nom, email, enabled, locked)
```

Les guards et directives qui lisent n'importe lequel de ces signals calculés se
réévaluent automatiquement quand le token change. Aucune gestion manuelle
d'abonnements n'est nécessaire.

---

## Barre d'outils : état connecté vs public

`shell.ts` lit `auth.isAuthenticated()` pour décider quoi afficher dans la barre
d'outils :

```html
@if (auth.isAuthenticated()) {
  <!-- Menu utilisateur : profil, déconnexion -->
} @else {
  <!-- Liens connexion et inscription -->
}
```

Le groupe "Administration" dans la sidenav lit `auth.isAdmin()` et n'est ajouté au
DOM que pour les utilisateurs admin.

---

## Page de profil

`/profile` charge l'utilisateur courant depuis `GET /auth/me` et affiche :
- Nom, email, statut du compte (activé, verrouillé)
- Les rôles et permissions de l'utilisateur (lus depuis les claims JWT, pas depuis
  `/auth/me`, car `/auth/me` retourne une liste de rôles vide)
- Un bouton "Modifier" qui ouvre `UpdateProfileDialog` pour changer le nom

Le dialog appelle `PUT /api/v1/users/{id}` et, en cas de succès, met à jour le
signal `currentUser` avec l'entité retournée.

---

## 401 à la connexion : cas particulier

Un 401 de `POST /auth/login` signifie des identifiants incorrects ou un compte
verrouillé/désactivé. Le comportement standard `UNAUTHENTICATED` (vider la session,
rediriger vers `/login`) créerait une boucle de redirection sur la page de connexion
elle-même. Le service d'auth détecte ce cas en vérifiant l'URL de la requête et
retourne l'erreur directement au composant de la page de connexion, qui affiche
le message backend en ligne sur le formulaire.

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `core/auth/auth.ts` | Signals de session, stockage token, tous les appels HTTP d'auth |
| `core/auth/jwt.ts` | Décodage du payload JWT (fonction pure, sans bibliothèque) |
| `core/auth/auth-guard.ts` | Exige une session valide |
| `core/auth/role-guard.ts` | Exige un rôle depuis les données de route |
| `core/auth/permission-guard.ts` | Exige une permission depuis les données de route |
| `core/auth/has-permission.ts` | Directive structurelle pour visibilité dans les templates |
| `features/auth/pages/login/login.page.ts` | Formulaire de connexion avec gestion 401 inline |
| `features/auth/pages/register/register.page.ts` | Formulaire d'inscription |
| `features/auth/pages/activate-account/activate-account.page.ts` | Activation par token |
| `features/auth/pages/profile/profile.page.ts` | Profil de l'utilisateur courant |
