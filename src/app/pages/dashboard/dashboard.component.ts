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
    // listen for updates from other components (eg. edit/save)
    window.addEventListener('printers:updated', this.onPrintersUpdated);
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    window.removeEventListener('printers:updated', this.onPrintersUpdated);
  }

  // handler bound to window event
  private onPrintersUpdated = () => {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // Load printers directly (skip SNMP for now)
    this.printerService.getAllPrinters().subscribe({
      next: (printers) => {
        console.log('Raw printers data:', printers); // Debug log
        this.printers = printers.map(printer => {
          const metrics = printer.PrinterMetrics?.[0];
          console.log('Printer:', printer.name, 'Type from API:', printer.printerType, 'Type from metrics:', metrics?.printerType); // Debug log
          return {
            ...printer,
            printerType: printer.printerType || metrics?.printerType || 'laser', // Use API data first
            inkLevels: (printer.printerType === 'inkjet' || metrics?.printerType === 'inkjet') ? {
              cyan: metrics?.cyanLevel || 75,
              magenta: metrics?.magentaLevel || 80,
              yellow: metrics?.yellowLevel || 65,
              black: metrics?.blackLevel || 90
            } : undefined,
            tonerLevel: metrics?.tonerLevel || 85
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
    this.selectedPrinter = { ...printer };
    console.log('Fetching details for printer ID:', printer.id); // Debug log

    // Get real detailed info from SNMP API
    this.printerService.getPrinterDetails(printer.id).subscribe({
      next: (response) => {
        console.log('SNMP API Response:', response); // Debug log
        if (response && response.printer_info) {
          console.log('Using SNMP data'); // Debug log
          this.selectedPrinter!.detailedInfo = this.mapSnmpToDetailedInfo(response, printer);
        } else {
          console.log('SNMP data incomplete, using mock'); // Debug log
          this.selectedPrinter!.detailedInfo = this.generateMockDetailedInfo(printer);
        }
        this.displayDetailDialog = true;
      },
      error: (error) => {
        console.error('Error fetching printer details:', error);
        console.log('API call failed, using mock data'); // Debug log
        this.selectedPrinter!.detailedInfo = this.generateMockDetailedInfo(printer);
        this.displayDetailDialog = true;
      }
    });
  }

  private mapSnmpToDetailedInfo(snmpData: any, printer: Printer): any {
    return {
      // 1. Printer Information
      productName: snmpData.printer_info?.model || printer.model,
      printerName: snmpData.printer_info?.name || printer.name,
      modelNumber: snmpData.printer_info?.model || printer.model,
      serialNumber: snmpData.printer_info?.serial_number || 'N/A',
      engineCycles: snmpData.printer_info?.engine_cycles || 'N/A',

      // 2. Memory Printer
      memory: {
        onBoard: snmpData.memory?.on_board || 'N/A',
        totalUsable: snmpData.memory?.total_usable || 'N/A'
      },

      // 3. Event Log
      eventLog: {
        entriesInUse: snmpData.event_log?.current_entries || 0,
        maxEntries: snmpData.event_log?.max_entries || 'N/A'
      },

      // 4. Paper Trays
      trays: this.mapPaperTrays(snmpData.paper_trays),

      // 5. Cartridge Information
      cartridge: this.mapCartridgeInfo(snmpData.cartridges)
    };
  }

  private mapPaperTrays(trays: any[]): any {
    if (!trays || trays.length === 0) {
      return {
        defaultPaperSize: 'A4',
        tray1Size: 'A4',
        tray1Type: 'Plain',
        tray2Size: 'Letter',
        tray2Type: 'Letterhead'
      };
    }

    return {
      defaultPaperSize: 'A4',
      tray1Size: trays[0]?.name || 'A4',
      tray1Type: 'Plain',
      tray2Size: trays[1]?.name || 'Letter',
      tray2Type: 'Letterhead'
    };
  }

  private mapCartridgeInfo(cartridges: any[]): any {
    if (!cartridges || cartridges.length === 0) {
      return {
        supplyLevel: 'N/A',
        serialNumber: 'N/A',
        pagesPrinted: 'N/A',
        firstInstallDate: 'N/A',
        lastUsedDate: new Date().toISOString().split('T')[0]
      };
    }

    const mainCartridge = cartridges[0];
    const level = mainCartridge.level;
    const maxLevel = mainCartridge.max;
    
    let supplyLevel = 'N/A';
    if (level !== null && maxLevel !== null && maxLevel > 0) {
      const percentage = Math.round((level / maxLevel) * 100);
      supplyLevel = percentage < 20 ? 'Low' : percentage < 50 ? 'Medium' : 'OK';
    }

    return {
      supplyLevel: supplyLevel,
      serialNumber: mainCartridge.serial_number || 'N/A',
      pagesPrinted: mainCartridge.pages_printed || 'N/A',
      firstInstallDate: mainCartridge.install_date || 'N/A',
      lastUsedDate: new Date().toISOString().split('T')[0]
    };
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
