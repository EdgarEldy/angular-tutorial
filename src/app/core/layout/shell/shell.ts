import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { Auth } from '../../auth/auth';
import { HasRoleDirective } from '../../auth/has-permission';

/** Navigation item displayed in the sidenav. */
interface NavItem {
  label: string;
  icon: string;
  route: string;
}

/**
 * Application shell: top toolbar + collapsible sidenav + router-outlet.
 *
 * The toolbar shows a user-account menu when the user is authenticated,
 * with links to their profile and a logout button. When not authenticated
 * (which should only happen briefly during session restore) it shows login
 * and register links.
 *
 * The "Administration" sidenav link is guarded by *appHasRole="'ADMIN'" so
 * it only renders for users with the ADMIN role. All other nav items are
 * visible to all authenticated users.
 *
 * Demonstrates:
 * - signal() for writable local state (sidenavOpen)
 * - AuthService computed signals (isAuthenticated, isAdmin, currentUser)
 * - *appHasRole structural directive for conditional nav items
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    HasRoleDirective,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  /** Whether the sidenav is open. */
  protected sidenavOpen = signal(true);

  protected navItems: NavItem[] = [
    { label: 'Dashboard',  icon: 'dashboard',   route: '/dashboard' },
    { label: 'Categories', icon: 'category',     route: '/categories' },
    { label: 'Products',   icon: 'inventory_2',  route: '/products' },
    { label: 'Customers',  icon: 'people',       route: '/customers' },
    { label: 'Orders',     icon: 'receipt_long', route: '/orders' },
  ];

  /** Toggle the sidenav between open and closed. */
  protected toggleSidenav(): void {
    this.sidenavOpen.update((open) => !open);
  }

  /**
   * Logs out the current user and navigates to /login.
   *
   * Auth.logout() clears the session even if the backend call fails.
   * Navigation happens inside the subscription callback, after the session
   * is confirmed cleared, to avoid guards seeing a stale isAuthenticated state.
   */
  protected logout(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }
}
