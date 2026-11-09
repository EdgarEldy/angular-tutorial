import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Auth } from '../../../../core/auth/auth';

/**
 * Dashboard page -- the authenticated landing screen.
 *
 * Acts as a hub that surfaces the most useful information at a glance:
 * - A personalised welcome derived from the currentUser signal.
 * - Four KPI cards (Categories, Products, Customers, Orders) whose values
 *   are placeholders on this branch; downstream feature branches will swap
 *   them for live totals once their respective services are wired.
 * - Quick-access tiles that navigate to each section.
 * - A session-info panel driven entirely by Auth signals, requiring no
 *   extra HTTP call: the app initialiser already called loadCurrentUser().
 *
 * No HTTP calls are made in this component. The Auth service is the only
 * dependency.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  protected readonly auth = inject(Auth);

  /**
   * Greeting name shown in the page title.
   *
   * Prefers first_name when available (populated after /auth/me resolves),
   * falls back to username, then to 'there' while the signal is null.
   *
   * @returns display name string.
   */
  protected readonly displayName = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return 'there';
    return u.first_name ?? u.username;
  });

  /**
   * Two-character uppercase initials for the session panel avatar.
   * Taken from the first two characters of the username so it stays
   * consistent with the shell toolbar avatar.
   *
   * @returns e.g. "JD" for username "jdoe", or "U" before load.
   */
  protected readonly initials = computed(() => {
    const u = this.auth.currentUser();
    return u ? u.username.slice(0, 2).toUpperCase() : 'U';
  });

  /**
   * Human-readable remaining lifetime of the JWT access token.
   *
   * Derives remaining seconds from the `exp` claim on each signal read.
   * Display-only: expiry enforcement is handled by authGuard.
   *
   * @returns e.g. "In 54 min", "In 1h 2 min", "Expired", or "Unknown".
   */
  protected readonly tokenExpiry = computed(() => {
    const exp = this.auth.claims()?.exp;
    if (!exp) return 'Unknown';
    const rem = exp - Math.floor(Date.now() / 1000);
    if (rem <= 0) return 'Expired';
    if (rem < 60) return `${rem}s`;
    if (rem < 3600) return `In ${Math.floor(rem / 60)} min`;
    return `In ${Math.floor(rem / 3600)}h ${Math.floor((rem % 3600) / 60)} min`;
  });

  /** Today's date formatted for the page subtitle. */
  protected readonly today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  /**
   * KPI summary cards displayed at the top of the dashboard.
   *
   * Values are placeholder strings until each feature branch wires
   * a real total from its resource service.
   *
   * `mod` drives the color modifier class (.kpi-accent, .kpi-violet, etc.)
   * applied to both the icon container and the KPI value.
   */
  protected readonly kpis = [
    { label: 'Categories', icon: 'category',      value: '--', trend: '', mod: 'accent' },
    { label: 'Products',   icon: 'inventory_2',   value: '--', trend: '', mod: 'violet' },
    { label: 'Customers',  icon: 'people',         value: '--', trend: '', mod: 'green'  },
    { label: 'Orders',     icon: 'receipt_long',  value: '--', trend: '', mod: 'amber'  },
  ] as const;

  /**
   * Quick-access tiles that navigate to each feature section.
   *
   * `mod` drives the same color modifier class as the KPI cards,
   * keeping both areas visually consistent.
   */
  protected readonly tiles = [
    { label: 'Categories', desc: 'Manage product categories and hierarchy', icon: 'category',     route: '/categories', mod: 'accent' },
    { label: 'Products',   desc: 'Browse, filter and edit product listings', icon: 'inventory_2', route: '/products',   mod: 'violet' },
    { label: 'Customers',  desc: 'View customer profiles and order history', icon: 'people',       route: '/customers',  mod: 'green'  },
    { label: 'Orders',     desc: 'Track and process incoming orders',         icon: 'receipt_long', route: '/orders',     mod: 'amber'  },
  ] as const;
}
