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
 * Application shell — dark sidebar + sticky toolbar + router-outlet.
 *
 * Responsibilities:
 * - Renders the persistent two-column layout (248 px sidebar + fluid main area).
 * - Provides dark/light theme toggling. The active theme is written as a
 *   `data-theme` attribute on `<html>` so that CSS custom properties defined
 *   in styles.scss react without any JavaScript color math.
 * - Manages the profile dropdown: opened by clicking the avatar button,
 *   dismissed by clicking anywhere else via a `document:click` HostListener.
 * - Derives the toolbar page title reactively from the current URL signal so
 *   that each feature page gets a correct heading automatically.
 *
 * Auth-aware content (real user name, role badge, sign-out action) is
 * placeholder until `feature/auth` wires up AuthService signals.
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
   * keeps the DOM attribute in sync even if `darkMode` were changed from
   * another place in the future. Angular's reactive graph handles scheduling.
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
   * The actual DOM mutation is handled by the `effect()` defined in the
   * constructor; this method only flips the signal value.
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
   * document-level listener that would immediately close the dropdown we
   * just opened.
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

  // ── Navigation ─────────────────────────────────────────────────────────────

  /** Main navigation items shown in the "Menu" section of the sidebar. */
  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard',  icon: 'dashboard',   route: '/dashboard' },
    { label: 'Categories', icon: 'category',     route: '/categories' },
    { label: 'Products',   icon: 'inventory_2',  route: '/products' },
    { label: 'Customers',  icon: 'people',       route: '/customers' },
    { label: 'Orders',     icon: 'receipt_long', route: '/orders' },
  ];

  /** Admin-only items shown in the "Administration" section of the sidebar. */
  protected readonly adminItems: NavItem[] = [
    { label: 'Users',       icon: 'manage_accounts', route: '/users' },
    { label: 'Roles',       icon: 'shield',          route: '/roles' },
    { label: 'Permissions', icon: 'lock_open',       route: '/permissions' },
  ];

  // ── Page title ─────────────────────────────────────────────────────────────

  /**
   * Current URL as a signal, refreshed on every NavigationEnd event.
   *
   * `startWith` seeds the signal with the router's current URL on
   * first render, before any NavigationEnd event has fired.
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
   * Toolbar title derived from the current route.
   *
   * Searches both nav sections for a route that is a prefix of the active URL.
   * Falls back to 'Dashboard' for the root path or any unrecognised route.
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
