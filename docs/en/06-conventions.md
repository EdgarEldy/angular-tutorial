# Code conventions

The conventions below apply to every file in the project. They exist to keep the
codebase consistent so a student can read any feature and immediately recognise
the patterns. When in doubt, look at an existing feature (e.g. `categories`) as the
reference implementation.

---

## Angular 21 idioms

Angular 21 introduced features that replace older APIs. This project uses them
exclusively. Never use the older alternatives even if they still work.

| New (use this) | Old (do not use) | Why |
|---|---|---|
| Standalone components (`standalone: true` by default) | `@NgModule` declarations | Modules added indirection with no benefit for small apps |
| `input()`, `output()`, `model()` signals | `@Input()`, `@Output()` decorators | Signals are synchronous, typed and composable |
| `@if`, `@for`, `@switch` | `*ngIf`, `*ngFor`, `*ngSwitch` | Built-in control flow has better performance and simpler syntax |
| `inject()` | Constructor injection | Works in factories, interceptors and guards without a constructor |
| `ChangeDetectionStrategy.OnPush` | Default | OnPush skips checks when inputs have not changed |
| `takeUntilDestroyed()` | Manual `ngOnDestroy` + `Subject` | Less boilerplate; works with `DestroyRef` injection |
| `provideAppInitializer()` | `APP_INITIALIZER` token | Cleaner API introduced in Angular 19 |

---

## TypeScript

**Strict mode is non-negotiable.** `tsconfig.json` enables `strict: true`. Every
TypeScript error is a real error; fix it rather than suppress it.

**No `any`.**
When you receive an `unknown` value (e.g. in a catch block), narrow the type with
a type guard:

```typescript
// Bad
} catch (e: any) { console.log(e.message); }

// Good
} catch (e) {
  const message = e instanceof Error ? e.message : 'Unknown error';
}
```

**No non-null assertions (`!`).**
Use optional chaining or a conditional instead:

```typescript
// Bad
const name = user!.firstName;

// Good
const name = user?.firstName ?? 'Unknown';
```

**Models use snake_case to match the API.**
The TypeScript compiler uses `noPropertyAccessFromIndexSignature` with `strict`,
but model interfaces with known properties work fine:

```typescript
// OK: property declared on the interface
const name = category.category_name;
```

---

## Angular CLI

Generate every file type that has a CLI schematic. The CLI creates the spec file and
registers the file consistently. Never create Angular files by hand.

| File to create | Command |
|---|---|
| Routed page component | `ng g component features/<name>/pages/<slug> --type=page` |
| Dialog component | `ng g component features/<name>/dialogs/<slug> --type=dialog` |
| Presentational component | `ng g component features/<name>/components/<slug>` |
| Feature service | `ng g service features/<name>/<name>` |
| Core service | `ng g service core/<folder>/<name>` |
| Guard | `ng g guard core/auth/<name> --functional` |
| Interceptor | `ng g interceptor core/<folder>/<name>` |
| Interface (model) | `ng g interface features/<name>/models/<slug> --type=model` |
| Directive | `ng g directive core/auth/<name>` |
| Pipe | `ng g pipe shared/pipes/<name>` |

> **Angular 21 naming:** the CLI no longer appends `.component.ts` or `.service.ts`
> to new files. A generated service `categories` produces `categories.ts` with class
> `Categories`. Guards keep their `.guard.ts` suffix.

---

## Reactive forms

Always use **typed reactive forms** (`FormGroup<{ field: FormControl<T> }>`). Never
use the untyped `FormGroup` without generics.

```typescript
// Bad
form = new FormGroup({ name: new FormControl('') });

// Good
form = new FormGroup({
  category_name: new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  }),
});
```

Put validators on the control, not in the template. The template only reads error
state:

```html
<mat-error @if="form.controls.category_name.hasError('required')">
  Category name is required.
</mat-error>
```

Disable the submit button while the request is in flight:

```html
<button mat-flat-button [disabled]="saving()" type="submit">Save</button>
```

---

## Templates

**All form fields use `mat-form-field appearance="outline"`.**
This is the visual standard of the whole application. Never use another appearance.

**Fields in dialogs get `.full-width`.**
Add this class to every `mat-form-field` in a dialog to span the full dialog width:

```scss
// In the dialog SCSS file
.full-width {
  width: 100%;
  display: block;
}
```

```html
<mat-form-field appearance="outline" class="full-width">
  <mat-label>Category name</mat-label>
  <input matInput formControlName="category_name" />
</mat-form-field>
```

**No logic in templates.**
Template expressions read signals and call helper methods. They do not compute
values:

```html
<!-- Bad: computation in the template -->
{{ items().filter(i => i.enabled).length }}

<!-- Good: computed signal in the class -->
{{ enabledCount() }}
```

---

## Services

A feature service (`categories.ts`, `products.ts`, etc.) is a pure HttpClient
wrapper:

- One method per endpoint.
- Returns a typed `Observable`.
- Never injects `MatSnackBar`, `Router`, `MatDialog` or any UI service.
- Never throws manually; lets errors propagate through the interceptor.

---

## Dialogs

Every create/edit form is a `MatDialog` dialog:

1. Inject `MAT_DIALOG_DATA` and `MatDialogRef` with `inject()`.
2. Pre-fill the form from the data (empty for create, the entity for edit).
3. Call the feature service on submit.
4. On success: `this.dialogRef.close(savedEntity)`.
5. On `BUSINESS_RULE`, `CONFLICT` or `VALIDATION` error: show `appError.message`
   inline, keep the dialog open.
6. On `FORBIDDEN` error: show a snackbar, close the dialog.

---

## Commits

Each commit follows the Conventional Commits format:

```
type(scope): short imperative summary

Paragraph 1: why this change was needed.

Paragraph 2: the technical approach or tradeoff.
```

Rules (see CLAUDE.md for the full list):

- One file per commit.
- Body is required (2-3 paragraphs).
- No em dashes. English only. No AI attribution.
- Commit immediately after finishing a file, not in a batch at the end.
