import { Component, OnInit } from '@angular/core';
import { PrinterService } from '../../services/printer.service';
import { PrinterAlert } from '../../interfaces/printer.interface';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss'
})
export class AlertsComponent implements OnInit {
  alerts: PrinterAlert[] = [];
  filteredAlerts: PrinterAlert[] = [];
  isLoading = false;

  // Filter options
  selectedSeverity: string | null = null;
  selectedStatus: string | null = null;
  searchText = '';

  severityOptions = [
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' }
  ];

  statusOptions = [
    { label: 'Unread', value: 'unread' },
    { label: 'Read', value: 'read' }
  ];

  constructor(private printerService: PrinterService) { }

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.isLoading = true;
    this.printerService.getPrinterAlerts().subscribe({
      next: (response: any) => {
        this.alerts = response.data || response;
        this.filterAlerts();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading alerts:', error);
        this.isLoading = false;
      }
    });
  }

  filterAlerts(): void {
    let filtered = [...this.alerts];

    // Filter by severity
    if (this.selectedSeverity) {
      filtered = filtered.filter(alert => alert.severity === this.selectedSeverity);
    }

    // Filter by status
    if (this.selectedStatus) {
      const isRead = this.selectedStatus === 'read';
      filtered = filtered.filter(alert => (alert.isAcknowledged === 1) === isRead);
    }

    // Filter by search text
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.printerName.toLowerCase().includes(searchLower) ||
        alert.message.toLowerCase().includes(searchLower)
      );
    }

    this.filteredAlerts = filtered;
  }

  acknowledgeAlert(alert: PrinterAlert): void {
    this.printerService.acknowledgeAlert(alert.id).subscribe({
      next: () => {
        alert.isAcknowledged = 1;
        alert.acknowledgedAt = new Date().toISOString();
        this.filterAlerts();
      },
      error: (error) => {
        console.error('Error acknowledging alert:', error);
      }
    });
  }

  markAllAsRead(): void {
    const unreadAlerts = this.alerts.filter(alert => alert.isAcknowledged === 0);

    unreadAlerts.forEach(alert => {
      this.acknowledgeAlert(alert);
    });
  }

  viewAlertDetails(alert: PrinterAlert): void {
    // TODO: Implement alert details modal
    console.log('View alert details:', alert);
  }

  deleteAlert(alert: PrinterAlert): void {
    if (confirm(`Are you sure you want to delete this alert?`)) {
      // TODO: Implement delete alert API
      this.alerts = this.alerts.filter(a => a.id !== alert.id);
      this.filterAlerts();
    }
  }

  getSeverityTagType(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'pi-exclamation-triangle';
      case 'high': return 'pi-exclamation-circle';
      case 'medium': return 'pi-info-circle';
      case 'low': return 'pi-info';
      default: return 'pi-info';
    }
  }

  getAlertTypeLabel(type: string): string {
    switch (type) {
      case 'toner_low': return 'Toner Low';
      case 'paper_empty': return 'Paper Empty';
      case 'offline': return 'Offline';
      case 'error': return 'Error';
      default: return type;
    }
  }

  getAlertRowClass(alert: PrinterAlert): string {
    if (alert.isAcknowledged === 0) {
      return 'unread-alert';
    }
    return '';
  }

  get hasUnreadAlerts(): boolean {
    return this.alerts.some(alert => alert.isAcknowledged === 0);
  }
}
