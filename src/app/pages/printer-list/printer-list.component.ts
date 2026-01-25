import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PrinterService } from '../../services/printer.service';
import { SnmpService } from '../../services/snmp.service';
import { Printer } from '../../interfaces/printer.interface';
import { PrinterMonitoringService } from '../../services/printer-monitoring.service';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-printer-list',
  templateUrl: './printer-list.component.html',
  styleUrl: './printer-list.component.scss'
})
export class PrinterListComponent implements OnInit {
  printers: Printer[] = [];
  showAddForm = false;
  addPrinterForm: FormGroup;
  isLoadingPrinters = false;
  isSubmitting = false;
  testingConnection = false;
  isLoadingConnection = false;

  // printerTypeOptions = [
  //   { label: 'Laser Printer (Toner)', value: 'laser' },
  //   { label: 'Inkjet Printer (Ink)', value: 'inkjet' }
  // ];

  constructor(
    private fb: FormBuilder,
    private printerService: PrinterService,
    private snmpService: SnmpService,
    private printerMonitoring: PrinterMonitoringService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {
    this.addPrinterForm = this.fb.group({
      ipAddress: ['', [Validators.required, Validators.pattern(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)]]
    });
  }

  ngOnInit(): void {
    this.loadPrinters();
  }

  serviceMessage(severity: any, summary: any, detail: any) {
    this.messageService.clear();
    this.messageService.add({ severity: severity, summary: summary, detail: detail, life: 3000 });
  }

  loadPrinters(): void {
    this.isLoadingPrinters = true;
    this.printerMonitoring.getPrinters()
      .then((response) => {
        console.log(response);
        this.printers = response.data
        this.isLoadingPrinters = false;
      })
      .catch((err) => {
        console.log(err);
        this.isLoadingPrinters = false;
      })
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.addPrinterForm.reset();
      this.isSubmitting = false;
    }
  }


  // onSubmit(): void {
  //   if (this.addPrinterForm.valid) {
  //     this.isLoading = true;
  //     const ipAddress = this.addPrinterForm.get('ipAddress')?.value;

  //     // Get printer data via SNMP to retrieve name, model, and other properties
  //     this.snmpService.getPrinterData(ipAddress, 'public').subscribe({
  //       next: (response) => {
  //         const printerInfo = response.data?.printer_info;
  //         const printerType: 'inkjet' | 'laser' = printerInfo?.model?.toLowerCase().includes('tank') ? 'inkjet' : 'laser';

  //         const printerData = {
  //           ipAddress,
  //           name: printerInfo?.name || `Printer-${ipAddress}`,
  //           model: printerInfo?.model || 'Unknown Model',
  //           printerType,
  //           location: 'Office',
  //           snmpCommunity: 'public',
  //           status: 'online' as const,
  //           snmpProfile: 'default',
  //           isActive: true
  //         };

  //         this.printerService.createPrinter(printerData).subscribe({
  //           next: (printer) => {
  //             if (printer) {
  //               this.printers.push(printer);
  //             }
  //             this.toggleAddForm();
  //             this.isLoading = false;
  //             alert(`Printer added successfully! Name: ${printerData.name}, Model: ${printerData.model}`);
  //           },
  //           error: (error) => {
  //             console.error('Error adding printer:', error);
  //             alert('Failed to add printer');
  //             this.isLoading = false;
  //           }
  //         });
  //       },
  //       error: (error) => {
  //         // If SNMP fails, create with minimal data as offline
  //         const printerData = {
  //           ipAddress,
  //           name: `Printer-${ipAddress}`,
  //           model: 'Unknown Model',
  //           printerType: 'laser' as const,
  //           location: 'Office',
  //           snmpCommunity: 'public',
  //           status: 'offline' as const,
  //           snmpProfile: 'default',
  //           isActive: true
  //         };

  //         this.printerService.createPrinter(printerData).subscribe({
  //           next: (printer) => {
  //             if (printer) {
  //               this.printers.push(printer);
  //             }
  //             this.toggleAddForm();
  //             this.isLoading = false;
  //             alert('Printer added successfully! Status: offline (SNMP connection failed)');
  //           },
  //           error: (error) => {
  //             console.error('Error adding printer:', error);
  //             alert('Failed to add printer');
  //             this.isLoading = false;
  //           }
  //         });
  //       }
  //     });
  //   }
  // }


  onSubmit(): void {
    if (this.addPrinterForm.valid) {
      this.isSubmitting = true;
      const ipAddress = this.addPrinterForm.get('ipAddress')?.value;
      const data = {
        ip: ipAddress,
        community: 'public'
      }
      this.printerMonitoring.addPrinters(data)
        .then((response: any) => {
          this.loadPrinters();
          this.toggleAddForm();
          this.serviceMessage('success', 'Success', 'Printer added successfully!');
        })
        .catch((err) => {
          console.log(err);
          this.serviceMessage('error', 'Error', 'Failed to add printer');
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    }
  }

  deletePrinter(printer: Printer): void {
    this.confirmationService.confirm({
      message: 'Do you want to delete this printer?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      acceptButtonStyleClass: "p-button-danger p-button-text",
      rejectButtonStyleClass: "p-button-text p-button-text",
      acceptIcon: "none",
      rejectIcon: "none",
      accept: () => {
        this.printerMonitoring.deletePrinters(printer.id)
          .then((response: any) => {
            console.log(response);
            this.printers = this.printers.filter(p => p.id !== printer.id);
            this.serviceMessage('success', 'Success', 'Printer deleted successfully!')
          })
          .catch((err) => {
            console.log(err);
            this.serviceMessage('error', 'Error', 'Failed to delete printer')
          })
      },
    })
  }

  refreshPrinterStatus(printer: Printer): void {
    if (!printer.ipAddress) return;
    const data = {
      ipAddress: printer.ipAddress,
      community: 'public'
    }
    this.isLoadingConnection = true
    this.printerMonitoring.testConections(data)
      .then((response) => {
        this.printerMonitoring.updatePrinters(printer.id, { status: 'online' })
        this.isLoadingConnection = false
        this.loadPrinters()
        this.cdr.detectChanges()
      })
      .catch((err) => {
        this.printerMonitoring.updatePrinters(printer.id, { status: 'offline' })
        this.serviceMessage('error', 'Error', 'Failed to connect to printer')
        this.isLoadingConnection = false
        this.loadPrinters()
        this.cdr.detectChanges()
      })
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }
}
