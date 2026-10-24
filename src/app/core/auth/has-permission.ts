import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';

import { Auth } from './auth';

/**
 * Structural directive that renders its template only when the current user
 * holds the specified permission in RESOURCE:ACTION format.
 *
 * Usage:
 *   <button *appHasPermission="'PRODUCT:WRITE'">Edit</button>
 *
 * This is a purely presentational guard -- the element is added to or
 * removed from the DOM, but the backend still enforces access on every
 * request. The directive re-evaluates whenever the auth session changes
 * (e.g., after logout) because it reads from AuthService signals inside
 * an effect().
 *
 * Structural directives use TemplateRef + ViewContainerRef instead of
 * host element manipulation. Angular expands *appHasPermission="'X'" into
 * [appHasPermission]="'X'" on an <ng-template>, then the directive controls
 * whether that template is stamped into the view container.
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  /**
   * The required permission string (e.g. 'PRODUCT:WRITE').
   * signal-based input() works with the structural directive pattern and
   * integrates with effect() for reactive updates.
   */
  readonly appHasPermission = input.required<string>();

  private readonly auth = inject(Auth);
  private readonly vcRef = inject(ViewContainerRef);
  private readonly template = inject(TemplateRef<unknown>);

  constructor() {
    // effect() re-runs whenever appHasPermission() or any auth signal changes
    effect(() => {
      if (this.auth.hasPermission(this.appHasPermission())) {
        // createEmbeddedView stamps the template; calling it again is a no-op
        // only if we clear first -- so we always clear before deciding
        this.vcRef.clear();
        this.vcRef.createEmbeddedView(this.template);
      } else {
        this.vcRef.clear();
      }
    });
  }
}

/**
 * Structural directive that renders its template only when the current user
 * holds the specified role.
 *
 * Usage:
 *   <a *appHasRole="'ADMIN'" routerLink="/admin">Admin</a>
 *
 * Shares the same pattern as HasPermissionDirective but checks roles instead
 * of permissions. Both directives are defined in this file because they are
 * conceptually paired and share the same auth mechanism.
 */
@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  /**
   * The required role name (e.g. 'ADMIN').
   * input.required() ensures the directive is never used without a value.
   */
  readonly appHasRole = input.required<string>();

  private readonly auth = inject(Auth);
  private readonly vcRef = inject(ViewContainerRef);
  private readonly template = inject(TemplateRef<unknown>);

  constructor() {
    effect(() => {
      this.vcRef.clear();
      if (this.auth.hasRole(this.appHasRole())) {
        this.vcRef.createEmbeddedView(this.template);
      }
    });
  }
}
