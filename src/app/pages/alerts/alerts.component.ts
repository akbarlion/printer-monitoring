import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { PrinterMonitoringService } from '../../services/printer-monitoring.service';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AlertsComponent implements OnInit, OnDestroy {
  alerts: any[] = [];
  filteredAlerts: any[] = [];
  selectedAlerts: any[] = [];
  isLoading = false;
  isMonitoring = false;
  wsConnected = false;

  // Filter options
  severityOptions = [
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' }
  ];

  statusOptions = [
    { label: 'Unread', value: 0 },
    { label: 'Read', value: 1 }
  ];

  // Filter values
  selectedSeverity: string = '';
  selectedStatus: number | null = null;
  searchText: string = '';

  private wsSubscription!: Subscription;

  constructor(
    private alertService: PrinterMonitoringService,
    private websocketService: WebsocketService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadAlerts();
    this.connectWebSocket();
  }

  ngOnDestroy() {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    this.websocketService.disconnect();
  }

  loadAlerts() {
    this.isLoading = true;
    this.alertService.getAlerts().subscribe({
      next: (response) => {
        this.alerts = response.data || [];
        this.filterAlerts();
        this.isLoading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load alerts'
        });
        this.isLoading = false;
      }
    });
  }

  connectWebSocket() {
    this.websocketService.connect();
    this.wsConnected = true;

    this.wsSubscription = this.websocketService.alerts$.subscribe(alert => {
      this.wsConnected = true;
      this.messageService.add({
        severity: 'warn',
        summary: 'New Alert',
        detail: `${alert.printer_id}: ${alert.message}`,
        life: 8000
      });
      this.loadAlerts();
      this.cdr.detectChanges();
    });

    this.websocketService.connectionStatus$.subscribe(status => {
      this.wsConnected = status;
      this.cdr.detectChanges();
    });
  }

  triggerMonitoring() {
    this.isMonitoring = true;
    this.alertService.triggerMonitoring().subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Printer monitoring completed'
        });
        setTimeout(() => this.loadAlerts(), 2000);
        this.isMonitoring = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to trigger monitoring'
        });
        this.isMonitoring = false;
      }
    });
  }

  filterAlerts() {
    this.filteredAlerts = this.alerts.filter(alert => {
      const matchesSeverity = !this.selectedSeverity || alert.severity == this.selectedSeverity;
      const matchesStatus = this.selectedStatus == null || alert.isAcknowledged == this.selectedStatus;
      const matchesSearch = !this.searchText ||
        alert.printerName.toLowerCase().includes(this.searchText.toLowerCase()) ||
        alert.message.toLowerCase().includes(this.searchText.toLowerCase());

      return matchesSeverity && matchesStatus && matchesSearch;
    });
  }

  acknowledgeAlert(alert: any) {
    this.alertService.acknowledgeAlert(alert.id, 'user').subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Alert marked as read'
        });
        this.loadAlerts();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to acknowledge alert'
        });
      }
    });
  }

  markAllAsRead() {
    // Get ALL unread alerts from API, not just the filtered ones
    this.alertService.getAlerts().subscribe({
      next: (response) => {
        const allUnreadAlerts = (response.data || []).filter((alert: any) => alert.isAcknowledged == 0);

        if (allUnreadAlerts.length == 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'No Unread Alerts',
            detail: 'All alerts are already acknowledged'
          });
          return;
        }

        let completed = 0;
        allUnreadAlerts.forEach((alert: any) => {
          this.alertService.acknowledgeAlert(alert.id, 'user').subscribe({
            next: () => {
              completed++;
              if (completed == allUnreadAlerts.length) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: `${allUnreadAlerts.length} alerts marked as read`
                });
                this.loadAlerts();
              }
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to acknowledge some alerts'
              });
            }
          });
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load alerts'
        });
      }
    });
  }

  markSelectedAsRead() {
    const unreadSelected = this.selectedAlerts.filter(alert => alert.isAcknowledged == 0);
    let completed = 0;

    unreadSelected.forEach(alert => {
      this.alertService.acknowledgeAlert(alert.id, 'user').subscribe({
        next: () => {
          completed++;
          if (completed == unreadSelected.length) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `${unreadSelected.length} selected alerts marked as read`
            });
            this.selectedAlerts = [];
            this.loadAlerts();
          }
        }
      });
    });
  }

  deleteAlert(alert: any) {
    // Implement delete functionality if needed
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Delete functionality not implemented yet'
    });
  }

  deleteSelectedAlerts() {
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Bulk delete functionality not implemented yet'
    });
  }

  viewAlertDetails(alert: any) {
    // Implement view details functionality
    this.messageService.add({
      severity: 'info',
      summary: 'Alert Details',
      detail: `${alert.printerName}: ${alert.message}`,
      life: 10000
    });
  }

  // Utility methods
  get hasUnreadAlerts(): boolean {
    return this.alerts.some(alert => alert.isAcknowledged == 0);
  }

  getAlertCountBySeverity(severity: string): number {
    return this.alerts.filter(alert => alert.severity == severity).length;
  }

  getAlertRowClass(alert: any): string {
    return alert.isAcknowledged == 0 ? 'unread-alert' : '';
  }

  getSeverityTagType(severity: string): string {
    switch (severity) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'high': return 'pi-exclamation-triangle';
      case 'medium': return 'pi-exclamation-circle';
      case 'low': return 'pi-info-circle';
      default: return 'pi-circle';
    }
  }

  getAlertTypeLabel(alertType: string): string {
    switch (alertType) {
      case 'connection': return 'Connection';
      case 'supply': return 'Supply';
      case 'paper': return 'Paper';
      case 'maintenance': return 'Maintenance';
      default: return alertType;
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
}
