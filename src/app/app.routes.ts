import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PrinterListComponent } from './pages/printer-list/printer-list.component';
import { PrinterDetailComponent } from './pages/printer-detail/printer-detail.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { AppLayoutComponent } from './layout/app.layout.component';
import { authGuard } from './guard/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'printers', component: PrinterListComponent },
      { path: 'printer/:id', component: PrinterDetailComponent },
      { path: 'alerts', component: AlertsComponent }
    ], canActivate: [authGuard]
  },
];
