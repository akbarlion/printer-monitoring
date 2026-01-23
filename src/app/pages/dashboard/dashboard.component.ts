import { Component, OnInit, OnDestroy } from '@angular/core';
import { PrinterService } from '../../services/printer.service';
import { Printer, PrinterAlert } from '../../interfaces/printer.interface';
import { interval, Subscription } from 'rxjs';
import { SnmpService } from '../../services/snmp.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  printers: Printer[] = [];
  alerts: PrinterAlert[] = [];
  isLoadingPrinters = false;
  dashboardStats = {
    total: 0,
    online: 0,
    offline: 0,
    warning: 0,
    laser: 0,
    inkjet: 0
  };

  private refreshSubscription?: Subscription;

  constructor(private printerService: PrinterService,
    private snmpService: SnmpService
  ) { }

  ngOnInit(): void {
    this.loadDashboardData();
    // this.startAutoRefresh();
    // listen for updates from other components (eg. edit/save)
    // window.addEventListener('printers:updated', this.onPrintersUpdated);
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    //   window.removeEventListener('printers:updated', this.onPrintersUpdated);
  }

  // handler bound to window event
  // private onPrintersUpdated = () => {
  //   this.loadDashboardData();
  // }

  loadDashboardData(): void {
    this.isLoadingPrinters = true;
    this.printerService.getAllPrinters().subscribe({
      next: (printers) => {
        // 1. Assign data awal
        this.printers = printers
        console.log(this.printers);


        // 2. Jalanin bulk SNMP
        this.runBulkSnmpCheck();

        // 3. Update statistik dashboard
        this.updateStats();
        this.isLoadingPrinters = false;
      },
      error: (err) => {
        console.error('Load printers error:', err);
        this.printers = [];
        this.updateStats();
        this.isLoadingPrinters = false;
      }
    });
  }

  private runBulkSnmpCheck(): void {
    const payload = this.printers
      .filter(p => p.ipAddress)
      .map(p => ({
        ip: p.ipAddress,
        community: p.snmpCommunity || 'public'
      }));

    if (!payload.length) return;

    this.snmpService.bulkCheckConnection(payload).subscribe({
      next: (res) => {
        res.results.forEach(result => {
          const printer = this.printers.find(
            p => p.ipAddress === result.ip
          );

          if (!printer) return;

          printer.status = result.data.connected
            ? 'online'
            : 'offline';

          printer.lastSeen = result.data.connected
            ? new Date().toISOString()
            : printer.lastSeen;
        });

        this.updateStats();
      },
      error: (err) => {
        console.error('Bulk SNMP error:', err);
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
        }
        this.displayDetailDialog = true;
      },
      error: (error) => {
        console.error('Error fetching printer details:', error);
        console.log('API call failed, using mock data'); // Debug log
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

}
