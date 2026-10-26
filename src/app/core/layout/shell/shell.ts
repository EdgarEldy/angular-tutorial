import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

import { Auth } from '../../auth/auth';

/** A single item in the navigation sidebar. */
interface NavItem {
  /** Human-readable label shown next to the icon. */
  label: string;
  /** Material icon ligature name (outlined variant). */
  icon: string;
  /** Angular router path, e.g. '/categories'. */
  route: string;
}

/**
 * Application shell: dark sidebar + sticky toolbar + router-outlet.
 *
 * Responsibilities:
 * - Renders the persistent two-column layout (248 px sidebar + fluid main area).
 * - Provides dark/light theme toggling: the active theme is written as a
 *   `data-theme` attribute on `<html>` so that CSS custom properties in
 *   styles.scss react without any JavaScript color math.
 * - Manages the profile dropdown: opened by clicking the avatar button,
 *   dismissed by clicking anywhere else via a `document:click` HostListener.
 * - Derives the toolbar page title reactively from the current URL signal.
 * - Reads AuthService signals to display the logged-in user's name and role,
 *   and exposes a `logout()` method for the sign-out button.
 * - Hides the Administration sidebar section from non-admin users via
 *   `auth.isAdmin()`.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // ── Theme ──────────────────────────────────────────────────────────────────

  /**
   * Tracks whether dark mode is currently active.
   *
   * Seeded from the OS preference so the first render already matches
   * the user's system theme without waiting for a manual toggle.
   * window.matchMedia is mocked in tests because jsdom does not implement it.
   */
  protected readonly darkMode = signal(
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  /**
   * Reflects the `darkMode` signal onto `<html data-theme>` as a side effect.
   *
   * Using `effect()` rather than an imperative write inside `toggleTheme()`
   * keeps the DOM attribute in sync even if `darkMode` were mutated elsewhere.
   * Angular schedules the effect after signal reads, so the DOM is always
   * consistent with the signal value.
   */
  constructor() {
    effect(() => {
      document.documentElement.setAttribute(
        'data-theme',
        this.darkMode() ? 'dark' : 'light',
      );
    });
  }

  /**
   * Toggle between dark and light mode.
   *
   * The DOM mutation happens in the `effect()` above; this method only flips
   * the signal value, keeping the template handler minimal.
   */
  protected toggleTheme(): void {
    this.darkMode.update((v) => !v);
  }

  // ── Profile dropdown ───────────────────────────────────────────────────────

  /** Whether the profile dropdown menu is currently visible. */
  protected readonly profileOpen = signal(false);

  /**
   * Toggle the profile dropdown open or closed.
   *
   * `event.stopPropagation()` prevents the click from bubbling to the
   * document-level listener that would immediately close the dropdown.
   *
   * @param event - Native click event from the profile button.
   */
  protected toggleProfile(event: MouseEvent): void {
    event.stopPropagation();
    this.profileOpen.update((v) => !v);
  }

  /**
   * Close the profile dropdown when the user clicks anywhere outside it.
   *
   * Registered on `document` so it fires for every click on the page.
   * Clicks on the profile button itself are stopped from bubbling by
   * `toggleProfile()`, so they never reach this handler.
   */
  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.profileOpen.set(false);
  }

  // ── Auth integration ───────────────────────────────────────────────────────

  /**
   * Full display name of the authenticated user.
   * Falls back to 'User' while the /auth/me call is still in-flight.
   *
   * @returns "First Last" or 'User' when currentUser is null.
   */
  protected readonly displayName = computed(() => {
    const u = this.auth.currentUser();
    return u ? `${u.first_name} ${u.last_name}` : 'User';
  });

  /**
   * Two-letter uppercase initials for the avatar circle.
   *
   * @returns e.g. "EE" for Edgar Eldy, or "U" when not yet loaded.
   */
  protected readonly initials = computed(() => {
    const u = this.auth.currentUser();
    return u
      ? `${u.first_name[0]}${u.last_name[0]}`.toUpperCase()
      : 'U';
  });

  /**
   * Primary role label shown under the user's name in the toolbar.
   * Uses the first role in the JWT claims; falls back to 'User'.
   *
   * @returns e.g. "ADMIN" or "USER".
   */
  protected readonly userRole = computed(
    () => this.auth.roles()[0] ?? 'User',
  );

  /**
   * Logs out the current user and navigates to /login.
   *
   * Auth.logout() clears the token from localStorage and resets session
   * signals even if the backend call fails, so the local session is always
   * terminated. Navigation happens in the subscription callback so that guards
   * re-evaluate only after the session has been cleared.
   */
  protected logout(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigate(['/login']);
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  /** Main navigation items shown in the "Menu" section of the sidebar. */
  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard',  icon: 'dashboard',   route: '/dashboard' },
    { label: 'Categories', icon: 'category',     route: '/categories' },
    { label: 'Products',   icon: 'inventory_2',  route: '/products' },
    { label: 'Customers',  icon: 'people',       route: '/customers' },
    { label: 'Orders',     icon: 'receipt_long', route: '/orders' },
  ];

  /** Admin-only items: rendered only when `auth.isAdmin()` is true. */
  protected readonly adminItems: NavItem[] = [
    { label: 'Users',       icon: 'manage_accounts', route: '/users' },
    { label: 'Roles',       icon: 'shield',          route: '/roles' },
    { label: 'Permissions', icon: 'lock_open',       route: '/permissions' },
  ];

  // ── Page title ─────────────────────────────────────────────────────────────

  /**
   * Current URL as a signal, refreshed on every NavigationEnd event.
   *
   * `startWith` seeds the signal with the router's current URL on first
   * render, before any NavigationEnd event has fired.
   */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Toolbar title derived from the active route.
   *
   * Searches both nav sections for a route that is a prefix of the active
   * URL. Falls back to 'Dashboard' for unrecognised or root paths.
   *
   * @returns The human-readable page name to display in the toolbar.
   */
  protected readonly pageTitle = computed(() => {
    const url = this.currentUrl() ?? '/';
    const all = [...this.navItems, ...this.adminItems];
    return (
      all.find(
        (item) => url === item.route || url.startsWith(item.route + '/'),
      )?.label ?? 'Dashboard'
    );
  });
}
