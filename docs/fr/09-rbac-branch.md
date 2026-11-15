# Branche : feature/rbac

Cette branche implémente les écrans d'administration pour les utilisateurs, rôles
et permissions. Tout est restreint au rôle ADMIN. Les trois routes (`/users`,
`/roles`, `/permissions`) sont groupées sous une route parente sans chemin qui
utilise `roleGuard` avec `data: { roles: ['ADMIN'] }`.

---

## Objectifs pédagogiques

Après avoir étudié cette branche, vous comprendrez :

- Comment regrouper des routes sous un guard partagé via une route parente sans
  chemin
- Comment construire un dialog d'assignation par cases à cocher (rôles aux
  utilisateurs, permissions aux rôles)
- Comment calculer un diff de deux ensembles et envoyer uniquement les assignations
  modifiées
- Comment la règle de protection de l'admin vis-à-vis de son propre compte
  fonctionne dans l'UI
- Comment les erreurs `422` (violation de règle métier) remontent comme erreur en
  ligne

---

## Écrans

| Route | Ce qu'il affiche |
|---|---|
| `/users` | Tableau paginé d'utilisateurs avec actions verrouiller/déverrouiller et supprimer |
| `/roles` | Liste des rôles avec leurs permissions ; créer, modifier, supprimer |
| `/permissions` | Liste de toutes les permissions ; créer, supprimer |

---

## Dialog Gérer les rôles (depuis la table Utilisateurs)

1. La ligne utilisateur a un bouton icône "Gérer les rôles".
2. Cliquer dessus ouvre un dialog qui appelle `GET /api/v1/users/{id}` pour charger
   les rôles actuels de l'utilisateur (l'endpoint de liste ne retourne aucun rôle).
3. Tous les rôles sont affichés comme cases à cocher. Ceux déjà assignés sont
   pré-cochés.
4. Quand l'admin clique Enregistrer, le dialog calcule le diff entre l'ensemble
   initial et l'ensemble final :
   - Rôles à ajouter : sélectionnés maintenant mais pas initialement assignés
   - Rôles à supprimer : non sélectionnés maintenant mais initialement assignés
5. Il appelle `POST /api/v1/users/{id}/roles/{roleId}` une fois par ajout et
   `DELETE /api/v1/users/{id}/roles/{roleId}` une fois par suppression.
6. En cas de succès : le dialog se ferme et la ligne utilisateur recharge son
   détail.

L'approche diff évite d'envoyer des assignations inchangées au backend et minimise
le nombre d'appels HTTP.

---

## Dialog Gérer les permissions (depuis la table Rôles)

Même pattern que Gérer les rôles :

1. Toutes les permissions sont chargées depuis `GET /api/v1/permissions`.
2. Celles déjà sur le rôle sont pré-cochées (depuis la liste des rôles qui
   embarque les permissions).
3. À l'enregistrement : diff calculé, `POST` et `DELETE` vers
   `/api/v1/roles/{roleId}/permissions/{permissionId}` pour chaque entrée modifiée.
4. La table des rôles reflète le changement à la fermeture.

---

## Règle de protection de l'admin

Un administrateur ne peut pas verrouiller ni supprimer son propre compte depuis
l'UI :

```html
<!-- Désactiver verrouiller/supprimer sur la ligne de l'utilisateur courant -->
<button
  mat-icon-button
  [disabled]="user.id === auth.currentUser()?.id"
  (click)="lockUser(user)">
  <mat-icon>lock</mat-icon>
</button>
```

Le backend applique aussi cette règle (422 sur auto-verrouillage), mais l'UI doit
empêcher l'action avant la requête pour une meilleure expérience utilisateur.

---

## 422 à la suppression

Supprimer un rôle encore assigné à des utilisateurs, ou une permission encore
assignée à des rôles, retourne `422`. L'UI affiche le message backend en ligne et
garde la ligne :

```typescript
deleteRole(id: number): void {
  this.rolesService.deleteRole(id).subscribe({
    next: () => this.loadRoles(),
    error: (err: AppError) => {
      if (err.kind === 'BUSINESS_RULE') {
        this.notification.error(err.message);
      }
    },
  });
}
```

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `features/users/users.ts` | Liste utilisateurs, verrouiller/déverrouiller, supprimer, déclencheur dialog Gérer rôles |
| `features/roles/roles.ts` | Liste rôles, déclencheur dialog Gérer permissions |
| `features/permissions/pages/permission-list/permission-list.page.ts` | Liste permissions |
| Dossier `dialogs/` de chaque fonctionnalité | Formulaires créer/modifier et dialogs d'assignation |
