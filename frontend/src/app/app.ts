import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ReportsService } from './core/reports.service';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected demoMode = false;
  private readonly api = inject(ReportsService);
  private readonly router = inject(Router);

  constructor() {
    void this.auth.restoreSession();
    this.api.demoConfig().subscribe({ next: ({ enabled }) => { this.demoMode = enabled; } });
  }

  protected async logout() {
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/');
    } catch {
      this.auth.sessionError.set('Could not securely end your session. Please try again.');
    }
  }
}
