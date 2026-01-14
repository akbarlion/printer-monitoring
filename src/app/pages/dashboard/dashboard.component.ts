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

  // --- Dialog & Detailed Info Logic ---

  displayDetailDialog: boolean = false;
  selectedPrinter: Printer | null = null;

  showPrinterDetails(printer: Printer): void {
    this.selectedPrinter = { ...printer }; // Create a copy

    // Generate Mock Data if missing (since backend might not provide it yet)
    if (!this.selectedPrinter.detailedInfo) {
      this.selectedPrinter.detailedInfo = this.generateMockDetailedInfo(printer);
    }

    this.displayDetailDialog = true;
  }

  private generateMockDetailedInfo(printer: Printer): any {
    const isLaser = printer.printerType === 'laser';

    return {
      // 1. Printer Information
      productName: printer.model + (isLaser ? ' LaserJet' : ' OfficeJet'),
      printerName: printer.name,
      modelNumber: printer.model.split(' ')[0] + '-X100',
      serialNumber: 'CN' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      engineCycles: Math.floor(Math.random() * 50000) + 1000,

      // 2. Memory Printer
      memory: {
        onBoard: '512 MB',
        totalUsable: '480 MB'
      },

      // 3. Event Log
      eventLog: {
        entriesInUse: Math.floor(Math.random() * 50),
        maxEntries: 500
      },

      // 4. Paper Trays and Options
      trays: {
        defaultPaperSize: 'A4',
        tray1Size: 'A4',
        tray1Type: 'Plain',
        tray2Size: 'Letter',
        tray2Type: 'Letterhead'
      },

      // 5. Cartridge Information
      cartridge: {
        supplyLevel: (printer.tonerLevel || 80) < 20 ? 'Low' : 'OK',
        serialNumber: 'CR' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        pagesPrinted: printer.PrinterMetrics?.[0]?.pageCounter || 1200,
        firstInstallDate: '2025-01-10',
        lastUsedDate: new Date().toISOString().split('T')[0]
      }
    };
  }
}
