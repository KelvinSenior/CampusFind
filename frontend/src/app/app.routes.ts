import { Routes } from '@angular/router';
import { adminGuard, studentGuard } from './core/auth.guard';
import { AuthPage } from './features/auth-page.component';
import { AdminDashboardPage } from './features/admin-dashboard-page.component';
import { BrowsePage } from './features/browse-page.component';
import { DashboardPage } from './features/dashboard-page.component';
import { HomePage } from './features/home-page.component';
import { ItemDetailPage } from './features/item-detail-page.component';
import { ReportPage } from './features/report-page.component';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'browse', component: BrowsePage },
  { path: 'login', component: AuthPage },
  { path: 'register', component: AuthPage },
  { path: 'report', component: ReportPage, canActivate: [studentGuard] },
  { path: 'dashboard', component: DashboardPage, canActivate: [studentGuard] },
  { path: 'admin', component: AdminDashboardPage, canActivate: [adminGuard] },
  { path: 'items/:id', component: ItemDetailPage },
  { path: '**', redirectTo: '' },
];
