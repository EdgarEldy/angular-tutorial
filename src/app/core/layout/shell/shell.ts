import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/** Navigation item displayed in the sidenav. */
interface NavItem {
  label: string;
  icon: string;
  route: string;
}

/**
 * Application shell: top toolbar + collapsible sidenav + router-outlet.
 *
 * Demonstrates:
 * - signal() for writable local state (sidenavOpen)
 * - MatSidenav with mode="side" on desktop, mode="over" on mobile
 * - RouterLink / RouterLinkActive for active nav highlighting
 * - RouterOutlet as the page content slot
 *
 * The sidenav toggle is a simple boolean signal – no @ngrx or external state
 * required for this UI pattern.
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
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
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
  toggleSidenav(): void {
    this.sidenavOpen.update((open) => !open);
  }
}
