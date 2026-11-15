# Conventions de code

Les conventions ci-dessous s'appliquent à chaque fichier du projet. Elles existent
pour que la base de code reste cohérente afin qu'un étudiant puisse lire n'importe
quelle fonctionnalité et reconnaître immédiatement les patterns. En cas de doute,
regardez une fonctionnalité existante (par ex. `categories`) comme référence.

---

## Idiomes Angular 21

Angular 21 a introduit des fonctionnalités qui remplacent d'anciennes API. Ce projet
les utilise exclusivement. N'utilisez jamais les alternatives plus anciennes même si
elles fonctionnent encore techniquement.

| Nouveau (à utiliser) | Ancien (à ne pas utiliser) | Pourquoi le changement |
|---|---|---|
| Composants standalone (`standalone: true` par défaut) | Déclarations `@NgModule` | Les modules ajoutaient de l'indirection sans bénéfice pour les petites apps |
| `input()`, `output()`, `model()` signals | Décorateurs `@Input()`, `@Output()` | Les signals sont synchrones, typés et composables |
| `@if`, `@for`, `@switch` | `*ngIf`, `*ngFor`, `*ngSwitch` | Le flow control natif a de meilleures performances et une syntaxe plus simple |
| `inject()` | Injection par constructeur | Fonctionne dans les factories, intercepteurs et guards sans constructeur |
| `ChangeDetectionStrategy.OnPush` | Par défaut | OnPush ne vérifie pas les changements quand les entrées n'ont pas changé |
| `takeUntilDestroyed()` | `ngOnDestroy` manuel + `Subject` | Moins de boilerplate ; fonctionne avec l'injection de `DestroyRef` |
| `provideAppInitializer()` | Token `APP_INITIALIZER` | API plus propre introduite dans Angular 19 |

---

## TypeScript

**Le mode strict est non négociable.** `tsconfig.json` active `strict: true`. Chaque
erreur TypeScript est une vraie erreur ; corrigez-la plutôt que de la supprimer.

**Pas de `any`.**
Quand vous recevez une valeur `unknown` (par ex. dans un bloc catch), réduisez son
type avec un type guard :

```typescript
// Mauvais
} catch (e: any) { console.log(e.message); }

// Bien
} catch (e) {
  const message = e instanceof Error ? e.message : 'Erreur inconnue';
}
```

**Pas d'assertions non-null (`!`).**
Utilisez le chaînage optionnel ou un conditionnel à la place :

```typescript
// Mauvais
const name = user!.firstName;

// Bien
const name = user?.firstName ?? 'Inconnu';
```

**Les modèles utilisent le snake_case pour correspondre à l'API.**
Les interfaces de modèle avec des propriétés connues fonctionnent parfaitement avec
le mode strict :

```typescript
// OK : propriété déclarée sur l'interface
const name = category.category_name;
```

---

## Angular CLI

Générez chaque type de fichier qui a un schéma CLI. Le CLI crée le fichier de spec
et enregistre le fichier de façon cohérente. Ne créez jamais de fichiers Angular à
la main.

| Fichier à créer | Commande |
|---|---|
| Composant page routé | `ng g component features/<nom>/pages/<slug> --type=page` |
| Composant dialog | `ng g component features/<nom>/dialogs/<slug> --type=dialog` |
| Composant de présentation | `ng g component features/<nom>/components/<slug>` |
| Service de fonctionnalité | `ng g service features/<nom>/<nom>` |
| Service core | `ng g service core/<dossier>/<nom>` |
| Guard | `ng g guard core/auth/<nom> --functional` |
| Intercepteur | `ng g interceptor core/<dossier>/<nom>` |
| Interface (modèle) | `ng g interface features/<nom>/models/<slug> --type=model` |
| Directive | `ng g directive core/auth/<nom>` |
| Pipe | `ng g pipe shared/pipes/<nom>` |

> **Nommage Angular 21 :** le CLI n'ajoute plus `.component.ts` ou `.service.ts`
> aux nouveaux fichiers. Un service généré comme `categories` produit `categories.ts`
> avec la classe `Categories`. Les guards gardent leur suffixe `.guard.ts`.

---

## Formulaires réactifs

Utilisez toujours des **formulaires réactifs typés**
(`FormGroup<{ champ: FormControl<T> }>`). N'utilisez jamais le `FormGroup` non typé
sans génériques.

```typescript
// Mauvais
form = new FormGroup({ name: new FormControl('') });

// Bien
form = new FormGroup({
  category_name: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  }),
});
```

Mettez les validateurs sur le contrôle, pas dans le template. Le template ne lit
que l'état d'erreur :

```html
<mat-error @if="form.controls.category_name.hasError('required')">
  Le nom de la catégorie est obligatoire.
</mat-error>
```

Désactivez le bouton de soumission pendant que la requête est en cours :

```html
<button mat-flat-button [disabled]="saving()" type="submit">Enregistrer</button>
```

---

## Templates

**Tous les champs de formulaire utilisent `mat-form-field appearance="outline"`.**
C'est la norme visuelle de toute l'application. N'utilisez jamais un autre aspect.

**Les champs dans les dialogs reçoivent `.full-width`.**
Ajoutez cette classe à chaque `mat-form-field` dans un dialog pour qu'il occupe
toute la largeur du dialog :

```scss
// Dans le fichier SCSS du dialog
.full-width {
  width: 100%;
  display: block;
}
```

```html
<mat-form-field appearance="outline" class="full-width">
  <mat-label>Nom de la catégorie</mat-label>
  <input matInput formControlName="category_name" />
</mat-form-field>
```

**Pas de logique dans les templates.**
Les expressions dans les templates lisent des signals et appellent des méthodes
helper. Elles ne calculent pas de valeurs :

```html
<!-- Mauvais : calcul dans le template -->
{{ items().filter(i => i.enabled).length }}

<!-- Bien : signal calculé dans la classe -->
{{ enabledCount() }}
```

---

## Services

Un service de fonctionnalité (`categories.ts`, `products.ts`, etc.) est un wrapper
HttpClient pur :

- Une méthode par endpoint.
- Retourne un `Observable` typé.
- N'injecte jamais `MatSnackBar`, `Router`, `MatDialog` ni aucun service UI.
- Ne lance jamais d'exception manuellement ; laisse les erreurs se propager via
  l'intercepteur.

---

## Dialogs

Chaque formulaire de création/modification est un dialog `MatDialog` :

1. Injecter `MAT_DIALOG_DATA` et `MatDialogRef` avec `inject()`.
2. Pré-remplir le formulaire depuis les données (vide pour la création, l'entité
   pour la modification).
3. Appeler le service de fonctionnalité lors de la soumission.
4. En cas de succès : `this.dialogRef.close(savedEntity)`.
5. En cas d'erreur `BUSINESS_RULE`, `CONFLICT` ou `VALIDATION` : afficher
   `appError.message` en ligne, garder le dialog ouvert.
6. En cas d'erreur `FORBIDDEN` : afficher une snackbar, fermer le dialog.

---

## Commits

Chaque commit suit le format Conventional Commits :

```
type(scope): résumé court à l'impératif

Paragraphe 1 : pourquoi ce changement était nécessaire.

Paragraphe 2 : l'approche technique ou le compromis.
```

Règles (voir CLAUDE.md pour la liste complète) :

- Un fichier par commit.
- Le corps est obligatoire (2-3 paragraphes).
- Pas de tirets em. En anglais uniquement. Pas d'attribution IA.
- Commitez immédiatement après avoir terminé un fichier, pas en batch à la fin.
