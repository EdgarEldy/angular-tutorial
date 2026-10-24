import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root application component.
 *
 * Serves as the entry point for the Angular router. All routes defined in
 * app.routes.ts are rendered inside this component's <router-outlet />.
 * The shell layout (toolbar + sidenav) is provided by ShellComponent, which
 * is mounted as the authenticated route wrapper in app.routes.ts.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {}
