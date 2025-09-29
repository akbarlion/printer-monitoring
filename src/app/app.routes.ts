import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PrinterListComponent } from './printer-list/printer-list.component';
import { PrinterDetailComponent } from './printer-detail/printer-detail.component';
import { AlertsComponent } from './alerts/alerts.component';
import { AppLayoutComponent } from './layout/app.layout.component';

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
    ]
  }
];
