import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * 403 Forbidden / Not Allowed page.
 *
 * Displayed when an authenticated user navigates to a route they do not have
 * permission to access. The authGuard redirects here instead of showing a blank
 * page or a raw error, giving the user context and a recovery path.
 */
@Component({
  selector: 'app-not-allowed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './not-allowed.html',
  styleUrl: './not-allowed.scss',
})
export class NotAllowedComponent {}
