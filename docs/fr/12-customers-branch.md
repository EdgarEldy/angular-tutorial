# Branche : feature/customers

La branche clients introduit une mise en page maître-détail : une liste paginée de
clients et une page de détail qui affiche les informations du client ainsi que les
produits qu'il a commandés. Les commandes d'un client spécifique sont chargées via
un endpoint paginé séparé.

---

## Objectifs pédagogiques

Après avoir étudié cette branche, vous comprendrez :

- Comment construire une mise en page maître-détail avec deux sections paginées
  indépendantes
- Comment `CustomerResponse.products` diffère d'une liste de commandes
- Comment valider des numéros de téléphone avec un validateur regex
- Comment les erreurs `422` de règle métier fonctionnent pour un email en doublon

---

## Écrans

| Route | Ce qu'il affiche |
|---|---|
| `/customers` | Tableau paginé avec recherche par nom ; utilisateurs authentifiés |
| `/customers/:id` | Détail : infos client, produits commandés, historique des commandes paginé |

---

## Page de détail : deux sources de données

La page de détail charge deux choses :

1. `GET /api/v1/customers/{id}` -- retourne `CustomerResponse` qui inclut un tableau
   `products: OrderedProductResponse[]`. Ce sont les lignes de produits de toutes
   les commandes, une entrée par ligne de commande. La page utilise cela pour
   afficher un tableau récapitulatif des "produits commandés" avec quantités et
   totaux.

2. `GET /api/v1/customers/{id}/orders` -- retourne une liste paginée de commandes.
   La page l'affiche dans un tableau paginé séparé pour que l'admin puisse parcourir
   l'historique complet des commandes.

Les deux tableaux ont des signals de pagination indépendants :

```typescript
// Signals du détail client
customerPage = signal(0);
customerSize = signal(10);

// Signals du sous-tableau commandes (séparés, jamais réinitialisés par la table principale)
ordersPage = signal(0);
ordersSize = signal(5);
```

Changer la page du tableau commandes ne réinitialise jamais la liste clients, et
vice versa.

---

## OrderedProductResponse vs OrderResponse

`CustomerResponse.products` est `OrderedProductResponse[]` :

```typescript
interface OrderedProductResponse {
  order_id:     number;
  product_id:   number;
  product_name: string;
  unit_price:   number;
  quantity:     number;
  total:        number;
}
```

Ce n'est pas une liste de commandes. C'est une vue plate de chaque ligne de produit
dans toutes les commandes du client, indexée par `order_id`. Utilisez-la pour le
résumé "produits commandés" sur la page de détail. Utilisez
`GET /customers/{id}/orders` pour la liste paginée de commandes réelle.

---

## Validation du formulaire dans le dialog

Le formulaire client valide :

| Champ | Validation |
|---|---|
| `first_name`, `last_name` | Obligatoire, non vide |
| `email` | Obligatoire, format email valide |
| `telephone` | Obligatoire, correspond à `^\+?[0-9()\-\s]{7,20}$` |
| `address` | Obligatoire, non vide |

Le validateur de téléphone est un validateur sync personnalisé utilisant
`Validators.pattern`.

---

## 422 pour email en doublon

Créer un client avec un email déjà existant retourne `422`. Le dialog affiche le
message backend en ligne et reste ouvert :

```typescript
error: (err: AppError) => {
  if (err.kind === 'BUSINESS_RULE') {
    this.formError.set(err.message);
  }
}
```

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `features/customers/customers.ts` | Wrapper HttpClient pour /customers |
| `features/customers/models/` | CustomerRequest, CustomerResponse, OrderedProductResponse |
| `features/customers/pages/customer-list/customer-list.page.ts` | Liste avec recherche |
| `features/customers/pages/customer-detail/customer-detail.page.ts` | Détail + commandes |
| `features/customers/dialogs/customer-form/customer-form.dialog.ts` | Formulaire créer/modifier |
