# Branche : feature/orders

La branche commandes complète le tutoriel. Elle dépend à la fois des branches
produits et clients car le dialog de création/modification de commande a besoin
de selects pour les deux.

---

## Objectifs pédagogiques

Après avoir étudié cette branche, vous comprendrez :

- Comment remplir plusieurs selects dans un dialog depuis deux services différents
- Comment afficher un aperçu "total estimé" côté client puis le remplacer par le
  `total` autoritaire du serveur
- Comment fonctionne le regroupement de `CustomerOrdersResponse` et comment
  l'aplatir pour l'affichage
- Comment filtrer les commandes par client ou produit

---

## Écrans

| Route | Ce qu'il affiche |
|---|---|
| `/orders` | Tableau paginé avec filtres client et produit ; authentifiés |
| `/orders/:id` | Détail : infos client + infos produit + quantité + total |

---

## Dialog créer/modifier : deux selects

Le dialog de commande charge deux listes à l'ouverture :

1. `GET /api/v1/customers?size=100` -- tous les clients pour le select client
2. `GET /api/v1/products?size=100` -- tous les produits pour le select produit

Les deux sont chargés en parallèle avec `forkJoin` :

```typescript
ngOnInit(): void {
  forkJoin({
    customers: this.customersService.getCustomers(0, 100),
    products:  this.productsService.getProducts(0, 100),
  }).subscribe(({ customers, products }) => {
    this.customers.set(customers.content);
    this.products.set(products.content);
  });
}
```

Utiliser un grand `size` (100) charge toutes les options en un seul appel, en
évitant la complexité d'un select paginé dans un dialog.

---

## Aperçu du total estimé

Le formulaire affiche une ligne "Total estimé" calculée côté client à partir de
`quantité * prix_unitaire`. Cela est clairement libellé comme une estimation. Après
l'enregistrement de la commande, la page affiche le champ `total` du serveur, qui
est la valeur autorisée :

```typescript
// Aperçu côté client (clairement libellé "Estimation")
estimatedTotal = computed(() => {
  const product = this.selectedProduct();
  const qty     = this.form.controls.quantity.value;
  return product && qty ? product.unit_price * qty : 0;
});
```

N'envoyez jamais `total` au backend dans le corps de création ou de modification.
Le serveur le calcule. N'affichez jamais `estimatedTotal` comme total final après
l'enregistrement de la commande.

---

## CustomerOrdersResponse : groupé puis aplati

`GET /api/v1/orders` retourne un `CustomerOrdersResponse` paginé :

```typescript
interface CustomerOrdersResponse {
  customer: OrderCustomerResponse;
  products: OrderedProductResponse[];  // lignes de commande de ce client
  total:    number;                    // somme pour ce client
}
```

Chaque entrée regroupe un client avec ses lignes de commande. Pour afficher un
tableau plat avec une ligne par ligne de commande, aplatissez la réponse :

```typescript
interface OrderRow {
  customer:     OrderCustomerResponse;
  order_id:     number;
  product_name: string;
  quantity:     number;
  total:        number;
}

// Aplatir CustomerOrdersResponse[] en OrderRow[]
const rows: OrderRow[] = data.flatMap(group =>
  group.products.map(p => ({
    customer:     group.customer,
    order_id:     p.order_id,
    product_name: p.product_name,
    quantity:     p.quantity,
    total:        p.total,
  }))
);
```

---

## Paramètres de filtre

| Filtre | Contrôle | Envoyé comme |
|---|---|---|
| Client | Select | `customerId` |
| Produit | Select | `productId` |

Les deux filtres sont optionnels. Utilisez le même pattern d'omission-si-vide
que dans la branche produits.

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `features/orders/orders.ts` | Wrapper HttpClient pour /orders |
| `features/orders/models/` | OrderRequest, OrderResponse, CustomerOrdersResponse |
| `features/orders/pages/order-list/order-list.page.ts` | Liste filtrée avec lignes aplaties |
| `features/orders/pages/order-detail/order-detail.page.ts` | Détail de la commande |
| `features/orders/dialogs/order-form/order-form.dialog.ts` | Créer/modifier avec deux selects |
