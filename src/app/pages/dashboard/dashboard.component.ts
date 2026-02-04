import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { PrinterService } from '../../services/printer.service';
import { Printer, PrinterAlert } from '../../interfaces/printer.interface';
import { interval, Subscription } from 'rxjs';
import { SnmpService } from '../../services/snmp.service';
import { PrinterMonitoringService } from '../../services/printer-monitoring.service';
import { WebsocketService } from '../../services/websocket.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  printers: Printer[] = [];
  alerts: PrinterAlert[] = [];
  isLoadingPrinters = false;
  wsConnected = false;
  dashboardStats = {
    total: 0,
    online: 0,
    offline: 0,
    warning: 0,
    laser: 0,
    inkjet: 0
  };

  private refreshSubscription?: Subscription;
  private wsSubscription?: Subscription;

  constructor(private printerService: PrinterService,
    private snmpService: SnmpService,
    private printerMonitoring: PrinterMonitoringService,
    private websocketService: WebsocketService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadDashboardData();
    this.connectWebSocket();
    // this.startAutoRefresh();
    // listen for updates from other components (eg. edit/save)
    // window.addEventListener('printers:updated', this.onPrintersUpdated);
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    this.websocketService.disconnect();
  }

  serviceMessage(severity: any, summary: any, detail: any) {
    this.messageService.clear()
    this.messageService.add({ severity: severity, summary: summary, detail: detail, life: 3000 });
  }

  loadDashboardData(): void {
    this.isLoadingPrinters = true;

    // Load printers
    this.printerMonitoring.getPrinters()
      .then((response: any) => {
        this.printers = response.data;
        console.log(this.printers);

        // Update stats setelah data loaded
        this.updateStats();
        
        this.isLoadingPrinters = false;
      })
      .catch((err) => {
        console.log(err);
        this.printers = [];
        this.updateStats();
        this.isLoadingPrinters = false;
      })

    // Load recent alerts
    this.loadRecentAlerts();
  }

  private loadRecentAlerts(): void {
    this.printerMonitoring.getAlerts().subscribe({
      next: (response) => {
        // Get only recent 5 alerts, sorted by creation date
        this.alerts = (response.data || [])
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
      },
      error: (error) => {
        console.error('Failed to load alerts:', error);
        this.alerts = [];
      }
    });
  }

  private fetchTonerLevels(): void {
    // Only fetch for online laser printers
    const laserPrinters = this.printers.filter(p => 
      p.status === 'online' && p.printerType === 'laser'
    );

    laserPrinters.forEach(printer => {
      this.printerService.getPrinterDetails(printer.id).subscribe({
        next: (response) => {
          if (response && response.data) {
            // Update toner level
            if (response.data.cartridge_info) {
              const supplyLevel = response.data.cartridge_info.supply_level;
              // Extract percentage from "1%" format or handle text like "Very Low"
              if (supplyLevel.includes('%')) {
                const percentage = parseInt(supplyLevel.replace('%', '')) || 0;
                printer.tonerLevel = percentage;
              } else {
                // Handle text levels like "Very Low", "Low", "OK"
                const levelMap: any = {
                  'Very Low': 5,
                  'Low': 15,
                  'Medium': 50,
                  'OK': 80,
                  'Full': 100
                };
                printer.tonerLevel = levelMap[supplyLevel] || 0;
              }
            }
            
            // Update alerts
            if (response.data.alerts && response.data.alerts.length > 0) {
              printer.alerts = response.data.alerts;
            }
          }
        },
        error: (error) => {
          console.log(`Failed to get data for ${printer.name}:`, error);
        }
      });
    });
  }

  private connectWebSocket(): void {
    this.websocketService.connect();
    this.wsConnected = true;

    // Listen for new alerts
    this.wsSubscription = this.websocketService.alerts$.subscribe(alert => {
      this.wsConnected = true;

      // Show toast notification for new alert
      this.messageService.add({
        severity: 'warn',
        summary: 'New Alert',
        detail: `${alert.printer_id}: ${alert.message}`,
        life: 8000
      });

      // Refresh alerts to get latest data
      this.loadRecentAlerts();
      this.cdr.detectChanges();
    });

    // Handle WebSocket connection status
    this.websocketService.connectionStatus$.subscribe(status => {
      this.wsConnected = status;
      this.cdr.detectChanges();
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
            p => p.ipAddress == result.ip
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
    this.dashboardStats.online = this.printers.filter(p => p.status == 'online').length;
    this.dashboardStats.offline = this.printers.filter(p => p.status == 'offline').length;
    this.dashboardStats.warning = this.printers.filter(p => p.status == 'warning').length;
    this.dashboardStats.laser = this.printers.filter(p => p.printerType == 'laser').length;
    this.dashboardStats.inkjet = this.printers.filter(p => p.printerType == 'inkjet' || p.printerType == 'unknown').length;
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

  refreshAlerts(): void {
    this.loadRecentAlerts();
  }

  get hasUnreadAlerts(): boolean {
    // This will check if there are any unread alerts in the displayed 5
    // The actual acknowledge all will fetch all alerts from API
    return this.alerts.some(alert => alert.isAcknowledged == 0);
  }

  acknowledgeAllAlerts(): void {
    // Get ALL unread alerts from API, not just the 5 displayed
    this.printerMonitoring.getAlerts().subscribe({
      next: (response) => {
        const allUnreadAlerts = (response.data || []).filter((alert: any) => alert.isAcknowledged == 0);

        if (allUnreadAlerts.length == 0) {
          this.serviceMessage('info', 'No Unread Alerts', 'All alerts are already acknowledged');
          return;
        }

        let completed = 0;
        allUnreadAlerts.forEach((alert: any) => {
          this.printerMonitoring.acknowledgeAlert(alert.id, 'user').subscribe({
            next: () => {
              completed++;
              if (completed == allUnreadAlerts.length) {
                this.serviceMessage('success', 'Success', `${allUnreadAlerts.length} alerts marked as read`);
                this.loadRecentAlerts();
              }
            },
            error: () => {
              this.serviceMessage('error', 'Error', 'Failed to acknowledge some alerts');
            }
          });
        });
      },
      error: () => {
        this.serviceMessage('error', 'Error', 'Failed to load alerts');
      }
    });
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

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'high': return 'pi-exclamation-triangle';
      case 'medium': return 'pi-exclamation-circle';
      case 'low': return 'pi-info-circle';
      default: return 'pi-circle';
    }
  }

  // --- Dialog & Detailed Info Logic ---

  displayDetailDialog: boolean = false;
  selectedPrinter: Printer | null = null;
  isLoadingDetails: boolean = false;

  showPrinterDetails(printer: Printer): void {
    this.selectedPrinter = { ...printer };
    this.displayDetailDialog = true; // Open dialog immediately
    this.isLoadingDetails = true; // Show loading state
    
    // Set initial skeleton data to prevent accordion flicker
    this.selectedPrinter.detailedInfo = this.getSkeletonDetailedInfo(printer);

    // Hit API after dialog is opened
    this.printerService.getPrinterDetails(printer.id).subscribe({
      next: (response) => {
        if (response && response.data && response.data.printer_info) {
          this.selectedPrinter!.detailedInfo = this.mapSnmpToDetailedInfo(response.data, printer);
        } else {
          this.selectedPrinter!.detailedInfo = this.getOfflineDetailedInfo(printer);
        }
        this.isLoadingDetails = false;
      },
      error: (error) => {
        this.selectedPrinter!.detailedInfo = this.getOfflineDetailedInfo(printer, error);
        this.isLoadingDetails = false;
      }
    });
  }

  private mapSnmpToDetailedInfo(snmpData: any, printer: Printer): any {
    const printerType = snmpData.printer_type || printer.printerType || 'unknown';
    
    return {
      // Connection status for successful response
      connectionStatus: 'Online',
      
      // 1. Printer Information
      productName: snmpData.printer_info?.model || printer.model,
      printerName: snmpData.printer_info?.name || printer.name,
      modelNumber: snmpData.printer_info?.model || printer.model,
      serialNumber: snmpData.printer_info?.serial_number || 'N/A',
      engineCycles: parseInt(snmpData.printer_info?.engine_cycles) || 0,

      // 2. Memory Printer
      memory: {
        onBoard: snmpData.memory?.on_board || 'N/A',
        totalUsable: 'N/A'
      },

      // 3. Event Log
      eventLog: {
        entriesInUse: 0,
        maxEntries: 'N/A'
      },

      // 4. Paper Trays
      trays: {
        defaultPaperSize: snmpData.paper_trays?.default_paper_size || 'N/A',
        tray1Size: snmpData.paper_trays?.tray_1_size || 'N/A',
        tray1Type: snmpData.paper_trays?.tray_1_type || 'N/A',
        tray2Size: snmpData.paper_trays?.tray_2_size || 'N/A',
        tray2Type: snmpData.paper_trays?.tray_2_type || 'N/A'
      },

      // 5. Cartridge/Ink Information - different for laser vs inkjet
      cartridge: this.mapCartridgeInfoByType(snmpData, printerType)
    };
  }

  private mapCartridgeInfoByType(snmpData: any, printerType: string): any {
    if (printerType === 'inkjet') {
      // For inkjet printers
      return {
        supplyLevel: 'Available', // General status
        serialNumber: 'N/A',
        pagesPrinted: parseInt(snmpData.cartridge_info?.pages_printed) || 0,
        firstInstallDate: 'N/A',
        lastUsedDate: 'N/A',
        // Ink levels from cartridge_info
        inkLevels: {
          cyan: snmpData.cartridge_info?.cyan_level || 'Unknown',
          magenta: snmpData.cartridge_info?.magenta_level || 'Unknown',
          yellow: snmpData.cartridge_info?.yellow_level || 'Unknown',
          black: snmpData.cartridge_info?.black_level || 'Unknown'
        },
        // Ink descriptions
        inkDescriptions: snmpData.cartridge_info?.cartridge_descriptions || {}
      };
    } else {
      // For laser printers (original logic)
      return {
        supplyLevel: snmpData.cartridge_info?.supply_level || 'N/A',
        serialNumber: snmpData.cartridge_info?.cartridge_serial || 'N/A',
        pagesPrinted: parseInt(snmpData.cartridge_info?.pages_printed) || 0,
        firstInstallDate: snmpData.cartridge_info?.cartridge_install_date || 'N/A',
        lastUsedDate: snmpData.cartridge_info?.last_used_date || 'N/A'
      };
    }
  }

  private mapPaperTrays(trays: any[]): any {
    if (!trays || trays.length == 0) {
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

  private mapCartridgeInfo(supplies: any): any {
    if (!supplies) {
      return {
        supplyLevel: 'N/A',
        serialNumber: 'N/A',
        pagesPrinted: 'N/A',
        firstInstallDate: 'N/A',
        lastUsedDate: new Date().toISOString().split('T')[0]
      };
    }

    // For inkjet printers with supplies object
    const hasInkData = supplies.black || supplies.cyan || supplies.magenta || supplies.yellow;
    
    return {
      supplyLevel: hasInkData ? 'Available' : 'Unknown',
      serialNumber: 'N/A',
      pagesPrinted: 'N/A',
      firstInstallDate: 'N/A',
      lastUsedDate: new Date().toISOString().split('T')[0],
      // Store ink levels for reference
      inkLevels: {
        black: supplies.black || 'Unknown',
        cyan: supplies.cyan || 'Unknown',
        magenta: supplies.magenta || 'Unknown',
        yellow: supplies.yellow || 'Unknown'
      }
    };
  }

  private getSkeletonDetailedInfo(printer: Printer): any {
    return {
      // 1. Printer Information
      productName: 'Loading...',
      printerName: 'Loading...',
      modelNumber: 'Loading...',
      serialNumber: 'Loading...',
      engineCycles: 0,

      // 2. Memory Printer
      memory: {
        onBoard: 'Loading...',
        totalUsable: 'Loading...'
      },

      // 3. Event Log
      eventLog: {
        entriesInUse: 0,
        maxEntries: 'Loading...'
      },

      // 4. Paper Trays
      trays: {
        defaultPaperSize: 'Loading...',
        tray1Size: 'Loading...',
        tray1Type: 'Loading...',
        tray2Size: 'Loading...',
        tray2Type: 'Loading...'
      },

      // 5. Cartridge Information
      cartridge: {
        supplyLevel: 'Loading...',
        serialNumber: 'Loading...',
        pagesPrinted: 0,
        firstInstallDate: 'Loading...',
        lastUsedDate: 'Loading...'
      }
    };
  }

  private getOfflineDetailedInfo(printer: Printer, error?: any): any {
    const errorMessage = error?.error?.message || 'Printer is offline or unreachable';
    
    return {
      // Connection status for error handling
      connectionStatus: 'Offline',
      errorMessage: errorMessage,
      
      // 1. Printer Information
      productName: printer.model || 'N/A',
      printerName: printer.name || 'N/A',
      modelNumber: printer.model || 'N/A',
      serialNumber: 'N/A - Printer Offline',
      engineCycles: 0, // Use 0 instead of string for number pipe

      // 2. Memory Printer
      memory: {
        onBoard: 'N/A - Printer Offline',
        totalUsable: 'N/A - Printer Offline'
      },

      // 3. Event Log
      eventLog: {
        entriesInUse: 0, // Use 0 instead of string for number pipe
        maxEntries: 'N/A - Printer Offline'
      },

      // 4. Paper Trays
      trays: {
        defaultPaperSize: 'N/A - Printer Offline',
        tray1Size: 'N/A - Printer Offline',
        tray1Type: 'N/A - Printer Offline',
        tray2Size: 'N/A - Printer Offline',
        tray2Type: 'N/A - Printer Offline'
      },

      // 5. Cartridge Information
      cartridge: {
        supplyLevel: 'N/A - Printer Offline',
        serialNumber: 'N/A - Printer Offline',
        pagesPrinted: 0,
        firstInstallDate: 'N/A - Printer Offline',
        lastUsedDate: 'N/A - Printer Offline'
      }
    };
  }

}
