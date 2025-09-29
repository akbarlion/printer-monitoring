import { Component, OnInit, OnDestroy } from '@angular/core';
import { PrinterService } from '../services/printer.service';
import { Printer, PrinterAlert } from '../interfaces/printer.interface';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  printers: Printer[] = [];
  alerts: PrinterAlert[] = [];
  dashboardStats = {
    total: 0,
    online: 0,
    offline: 0,
    warning: 0
  };
  
  private refreshSubscription?: Subscription;

  constructor(private printerService: PrinterService) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadDashboardData(): void {
    // Load printers directly (skip SNMP for now)
    this.printerService.getAllPrinters().subscribe({
      next: (printers) => {
        this.printers = printers;
        this.updateStats();
      },
      error: (error) => {
        console.error('Error loading printers:', error);
        // Set empty array if API fails
        this.printers = [];
        this.updateStats();
      }
    });

    this.printerService.getPrinterAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts.filter(alert => !alert.isAcknowledged).slice(0, 5);
      },
      error: (error) => {
        console.error('Error loading alerts:', error);
        this.alerts = [];
      }
    });
  }

  private updateStats(): void {
    this.dashboardStats.total = this.printers.length;
    this.dashboardStats.online = this.printers.filter(p => p.status === 'online').length;
    this.dashboardStats.offline = this.printers.filter(p => p.status === 'offline').length;
    this.dashboardStats.warning = this.printers.filter(p => p.status === 'warning').length;
  }

  private startAutoRefresh(): void {
    // Refresh every 30 seconds with SNMP data
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadDashboardData();
    });
  }

  refreshNow(): void {
    this.loadDashboardData();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'online': return 'status-online';
      case 'offline': return 'status-offline';
      case 'warning': return 'status-warning';
      case 'error': return 'status-error';
      default: return 'status-unknown';
    }
  }

  getSeverityClass(severity: string): string {
    return `severity-${severity}`;
  }
}
