import { Component, OnInit, OnDestroy } from '@angular/core';
import { PrinterService } from '../../services/printer.service';
import { Printer, PrinterAlert } from '../../interfaces/printer.interface';
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
    warning: 0,
    laser: 0,
    inkjet: 0
  };

  private refreshSubscription?: Subscription;

  constructor(private printerService: PrinterService) { }

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
        this.printers = printers.map(printer => {
          const metrics = printer.PrinterMetrics?.[0];
          return {
            ...printer,
            printerType: metrics?.printerType || 'laser',
            inkLevels: metrics?.printerType === 'inkjet' ? {
              cyan: metrics.cyanLevel,
              magenta: metrics.magentaLevel,
              yellow: metrics.yellowLevel,
              black: metrics.blackLevel
            } : undefined,
            tonerLevel: metrics?.tonerLevel
          };
        });
        this.updateStats();
      },
      error: (error) => {
        console.error('Error loading printers:', error);
        this.printers = [];
        this.updateStats();
      }
    });

    this.printerService.getPrinterAlerts().subscribe({
      next: (response: any) => {
        const alerts = response.data || response;
        this.alerts = alerts.filter((alert: PrinterAlert) => alert.isAcknowledged === 0).slice(0, 5);
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
    this.dashboardStats.laser = this.printers.filter(p => p.printerType === 'laser').length;
    this.dashboardStats.inkjet = this.printers.filter(p => p.printerType === 'inkjet').length;
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
