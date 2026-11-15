# Branche : feature/categories

Catégories est la première fonctionnalité CRUD complète et le pattern de référence
que toutes les fonctionnalités suivantes copient. Étudiez cette branche avant
d'implémenter produits, clients ou commandes.

---

## Objectifs pédagogiques

Après avoir étudié cette branche, vous comprendrez :

- Comment structurer un dossier de fonctionnalité (service, modèles, routes, pages,
  dialogs)
- Comment câbler une page de liste paginée avec les états loading/error/empty
- Comment un dialog de création/modification pré-remplit depuis des données
  existantes et gère les erreurs en ligne
- Comment utiliser `*appHasRole` pour afficher conditionnellement les actions
  réservées aux admins
- Comment afficher les erreurs `422` de règle métier en ligne dans le dialog

---

## Écrans

| Route | Ce qu'il affiche |
|---|---|
| `/categories` | Tableau paginé (nom de catégorie, dates) ; public |
| `/categories/:id` | Page de détail : infos catégorie et ses produits ; public |

Les actions admin (Nouveau, Modifier, Supprimer) ne sont affichées qu'aux
utilisateurs avec le rôle ADMIN, via `*appHasRole="'ADMIN'"` sur les boutons
concernés. Le backend applique la même restriction ; masquer les boutons est une
amélioration UX, pas une mesure de sécurité.

---

## États de la page de liste

La page de liste a trois états de signal explicites :

```typescript
loading  = signal(true);
error    = signal<AppError | null>(null);
items    = signal<CategoryResponse[]>([]);
total    = signal(0);
page     = signal(0);
size     = signal(10);
```

Le `loading = signal(true)` initial signifie que le spinner s'affiche immédiatement
au premier rendu, avant que l'appel HTTP ne retourne.

---

## Dialog créer/modifier

Le même composant dialog (`CategoryFormDialog`) gère la création et la modification.
`MAT_DIALOG_DATA` détermine le mode :

```typescript
// Dans le dialog
const data = inject<CategoryResponse | null>(MAT_DIALOG_DATA);
// null -> mode création ; CategoryResponse -> mode modification

this.form = new FormGroup({
  category_name: new FormControl(data?.category_name ?? '', {
    nonNullable: true,
    validators: [Validators.required],
  }),
});
```

À la soumission, le dialog appelle soit `createCategory()` soit
`updateCategory(id, ...)`. En cas de succès, il appelle
`this.dialogRef.close(savedEntity)`. La page de liste écoute l'événement de
fermeture et recharge la liste.

---

## 422 règle métier : catégorie avec produits

Supprimer une catégorie qui a encore des produits retourne `422`. L'UI affiche le
message backend comme une snackbar et garde la ligne dans le tableau :

```typescript
deleteCategory(id: number): void {
  this.categoriesService.deleteCategory(id).subscribe({
    next: () => this.loadCategories(),
    error: (err: AppError) => {
      // BUSINESS_RULE : "Cannot delete category with products"
      this.notification.error(err.message);
    },
  });
}
```

---

## Partager les catégories avec la fonctionnalité produits

La fonctionnalité produits a besoin d'une liste de catégories pour remplir le
select de catégorie dans le dialog produit. Plutôt que de dupliquer l'appel HTTP,
la fonctionnalité produits importe et appelle `CategoriesService` directement.
Cela évite de définir un second service pour les mêmes données et garde les modèles
de catégories en un seul endroit.

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `features/categories/categories.ts` | Wrapper HttpClient pour /categories |
| `features/categories/models/` | CategoryRequest, CategoryResponse |
| `features/categories/pages/category-list/category-list.page.ts` | Liste paginée |
| `features/categories/pages/category-detail/category-detail.page.ts` | Détail |
| `features/categories/dialogs/category-form/category-form.dialog.ts` | Créer/modifier |
| `features/categories/categories.routes.ts` | Routes lazy pour cette fonctionnalité |
