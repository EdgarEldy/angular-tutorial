# Branche : feature/products

La branche produits ajoute une page de liste avec quatre contrôles de filtre
simultanés et un dialog de création/modification qui inclut un sélecteur de
catégorie. Elle introduit aussi l'erreur `409` de conflit pour le verrou optimiste.

---

## Objectifs pédagogiques

Après avoir étudié cette branche, vous comprendrez :

- Comment construire une barre de filtres réactive où chaque contrôle met à jour
  la requête indépendamment
- Comment anti-rebondir (debounce) un champ texte pour ne pas appeler le backend à
  chaque frappe
- Comment omettre les paramètres de filtre vides de la chaîne de requête
- Comment `linkedSignal` réinitialise la pagination quand un filtre change
- Comment gérer `409` (produit modifié par quelqu'un d'autre) dans un dialog

---

## Contrôles de filtre

| Contrôle | Type | Déclencheur | Envoyé comme |
|---|---|---|---|
| Catégorie | Select | Au changement | `categoryId` |
| Nom du produit | Champ texte | Debounce 300ms | `productName` |
| Prix min | Champ numérique | Au blur | `minPrice` |
| Prix max | Champ numérique | Au blur | `maxPrice` |

Le filtre nom est debouncé pour ne pas appeler le backend à chaque frappe. Les
filtres de prix s'appliquent au blur car les utilisateurs s'attendent à saisir le
nombre entier avant la mise à jour de la liste.

Tout changement dans n'importe quel filtre réinitialise la page à 0 :

```typescript
// linkedSignal : quand les filtres changent, réinitialiser la page
page = linkedSignal({
  source: () => [this.categoryId(), this.productName(), this.minPrice(), this.maxPrice()],
  computation: () => 0,
});
```

---

## Omettre les filtres vides

N'envoyez jamais une chaîne vide ou null comme paramètre de requête. Utilisez le
pattern de spread conditionnel pour construire l'objet params :

```typescript
const params = {
  page: this.page(),
  size: this.size(),
  ...(this.categoryId()  ? { categoryId:   this.categoryId()  } : {}),
  ...(this.productName() ? { productName:  this.productName() } : {}),
  ...(this.minPrice() != null ? { minPrice: this.minPrice()   } : {}),
  ...(this.maxPrice() != null ? { maxPrice: this.maxPrice()   } : {}),
};
```

Un paramètre absent et un paramètre chaîne vide ont des significations différentes
pour le backend. Le backend interprète `productName=` (chaîne vide) comme un filtre
qui ne correspond à aucun produit, pas comme "pas de filtre". Omettez toujours les
clés sans valeur.

---

## Select de catégorie dans le dialog produit

Le dialog de création/modification produit a besoin d'une liste de catégories pour
remplir le select. Il appelle `CategoriesService.getCategories()` avec un grand
`size` (ex. 100) pour charger toutes les catégories en une fois. Cela évite la
pagination dans le select, qui serait gênante dans un dialog. Le service de
catégories est déjà disponible (introduit dans la branche catégories), il n'y a
pas de nouveau service à créer.

---

## 409 à la mise à jour (verrou optimiste)

`PUT /api/v1/products/{id}` peut retourner `409` quand une autre requête a modifié
le produit entre le moment où le dialog de modification a été ouvert et le moment
où Enregistrer a été cliqué. Le dialog :

1. Affiche le message backend en ligne (pas une snackbar, pas une redirection).
2. Garde le dialog ouvert.
3. Affiche un bouton "Recharger le produit" qui appelle `GET /api/v1/products/{id}`
   et rafraîchit le formulaire avec les dernières valeurs.

```typescript
error: (err: AppError) => {
  if (err.kind === 'CONFLICT') {
    this.formError.set(err.message);
    this.showReload.set(true);
  }
}
```

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `features/products/products.ts` | Wrapper HttpClient pour /products |
| `features/products/models/` | ProductRequest, ProductResponse |
| `features/products/pages/product-list/product-list.page.ts` | Liste paginée avec filtres |
| `features/products/dialogs/product-form/product-form.dialog.ts` | Créer/modifier avec gestion 409 |
