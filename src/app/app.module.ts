import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthInterceptor } from './interceptors/auth.interceptor';

import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PrinterListComponent } from './printer-list/printer-list.component';
import { PrinterDetailComponent } from './printer-detail/printer-detail.component';
import { AlertsComponent } from './alerts/alerts.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { AppLayoutComponent } from './layout/app.layout.component';


@NgModule({
  declarations: [
    AppComponent,
    TopbarComponent,
    AppLayoutComponent,
    LoginComponent,
    DashboardComponent,
    PrinterListComponent,
    PrinterDetailComponent,
    AlertsComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes),
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    TableModule,
    ToastModule,
    ConfirmDialogModule,
    RippleModule,
    TooltipModule,
    DropdownModule,
    TagModule,
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }