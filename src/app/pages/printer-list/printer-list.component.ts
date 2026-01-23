import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PrinterService } from '../../services/printer.service';
import { SnmpService } from '../../services/snmp.service';
import { Printer } from '../../interfaces/printer.interface';

@Component({
  selector: 'app-printer-list',
  templateUrl: './printer-list.component.html',
  styleUrl: './printer-list.component.scss'
})
export class PrinterListComponent implements OnInit {
  printers: Printer[] = [];
  showAddForm = false;
  addPrinterForm: FormGroup;
  // Edit printer state
  editingPrinterId: string | null = null;
  editPrinterForm: FormGroup;
  isLoading = false;
  testingConnection = false;

  printerTypeOptions = [
    { label: 'Laser Printer (Toner)', value: 'laser' },
    { label: 'Inkjet Printer (Ink)', value: 'inkjet' }
  ];

  constructor(
    private fb: FormBuilder,
    private printerService: PrinterService,
    private snmpService: SnmpService
  ) {
    this.addPrinterForm = this.fb.group({
      ipAddress: ['', [Validators.required, Validators.pattern(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)]]
    });

    this.editPrinterForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      ipAddress: ['', [Validators.required, Validators.pattern(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)]],
      model: ['', Validators.required],
      printerType: ['laser', Validators.required],
      location: ['', Validators.required],
      snmpCommunity: ['public', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadPrinters();
  }

  loadPrinters(): void {
    this.isLoading = true;
    this.printerService.getAllPrinters().subscribe({
      next: (printers) => {
        this.printers = printers.map(printer => {
          const metrics = printer.PrinterMetrics?.[0];
          const finalType = printer.printerType || metrics?.printerType || 'laser';
          return {
            ...printer,
            printerType: finalType,
            inkLevels: finalType === 'inkjet' ? {
              cyan: metrics?.cyanLevel,
              magenta: metrics?.magentaLevel,
              yellow: metrics?.yellowLevel,
              black: metrics?.blackLevel
            } : undefined,
            tonerLevel: metrics?.tonerLevel
          };
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading printers:', error);
        this.isLoading = false;
      }
    });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.addPrinterForm.reset();
    }
  }

  testConnection(): void {
    if (this.addPrinterForm.get('ipAddress')?.valid && this.addPrinterForm.get('snmpCommunity')?.valid) {
      this.testingConnection = true;
      const ip = this.addPrinterForm.get('ipAddress')?.value;
      const community = this.addPrinterForm.get('snmpCommunity')?.value;

      this.snmpService.testConnection(ip, community).subscribe({
        next: (result) => {
          alert(result.success ? 'Connection successful!' : `Connection failed: ${result.message}`);
          this.testingConnection = false;
        },
        error: (error) => {
          alert('Connection test failed');
          this.testingConnection = false;
        }
      });
    }
  }

  onSubmit(): void {
    if (this.addPrinterForm.valid) {
      this.isLoading = true;
      const ipAddress = this.addPrinterForm.get('ipAddress')?.value;

      // Get printer data via SNMP to retrieve name, model, and other properties
      this.snmpService.getPrinterData(ipAddress, 'public').subscribe({
        next: (response) => {
          const printerInfo = response.data?.printer_info;
          const printerType: 'inkjet' | 'laser' = printerInfo?.model?.toLowerCase().includes('tank') ? 'inkjet' : 'laser';

          const printerData = {
            ipAddress,
            name: printerInfo?.name || `Printer-${ipAddress}`,
            model: printerInfo?.model || 'Unknown Model',
            printerType,
            location: 'Office',
            snmpCommunity: 'public',
            status: 'online' as const,
            snmpProfile: 'default',
            isActive: true
          };

          this.printerService.createPrinter(printerData).subscribe({
            next: (printer) => {
              if (printer) {
                this.printers.push(printer);
              }
              this.toggleAddForm();
              this.isLoading = false;
              alert(`Printer added successfully! Name: ${printerData.name}, Model: ${printerData.model}`);
            },
            error: (error) => {
              console.error('Error adding printer:', error);
              alert('Failed to add printer');
              this.isLoading = false;
            }
          });
        },
        error: (error) => {
          // If SNMP fails, create with minimal data as offline
          const printerData = {
            ipAddress,
            name: `Printer-${ipAddress}`,
            model: 'Unknown Model',
            printerType: 'laser' as const,
            location: 'Office',
            snmpCommunity: 'public',
            status: 'offline' as const,
            snmpProfile: 'default',
            isActive: true
          };

          this.printerService.createPrinter(printerData).subscribe({
            next: (printer) => {
              if (printer) {
                this.printers.push(printer);
              }
              this.toggleAddForm();
              this.isLoading = false;
              alert('Printer added successfully! Status: offline (SNMP connection failed)');
            },
            error: (error) => {
              console.error('Error adding printer:', error);
              alert('Failed to add printer');
              this.isLoading = false;
            }
          });
        }
      });
    }
  }

  deletePrinter(printer: Printer): void {
    if (confirm(`Are you sure you want to delete ${printer.name}?`)) {
      this.printerService.deletePrinter(printer.id).subscribe({
        next: () => {
          this.printers = this.printers.filter(p => p.id !== printer.id);
          alert('Printer deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting printer:', error);
          alert('Failed to delete printer');
        }
      });
    }
  }

  refreshPrinterStatus(printer: Printer): void {
    if (!printer.ipAddress) return;

    this.snmpService.testConnection(printer.ipAddress, printer.snmpCommunity || 'public').subscribe({
      next: (result) => {
        console.log('SNMP test result for', printer.ipAddress, result);
        const newStatus = result.success ? 'online' : 'offline';
        const updateData = { status: newStatus as 'online' | 'offline' };

        this.printerService.updatePrinter(printer.id, updateData).subscribe({
          next: (updatedPrinter) => {
            console.log('API update response:', updatedPrinter);
            const index = this.printers.findIndex(p => p.id === printer.id);
            if (index !== -1) {
              this.printers[index] = { ...this.printers[index], ...updatedPrinter };
            }
            // notify other parts of the app (dashboard) that printers updated
            try { window.dispatchEvent(new CustomEvent('printers:updated')); } catch (e) { /* noop */ }
            alert(`Status updated: ${newStatus}`);
          },
          error: (error) => {
            console.error('Error updating printer status:', error);
            alert('Failed to update status');
          }
        });
      },
      error: (error) => {
        console.error('SNMP test failed:', error);
        alert('SNMP connection failed');
      }
    });
  }

  // --- Edit printer methods ---
  openEdit(printer: Printer): void {
    this.editingPrinterId = printer.id;
    this.editPrinterForm.reset({
      name: printer.name,
      ipAddress: printer.ipAddress,
      model: printer.model,
      printerType: printer.printerType || 'laser',
      location: printer.location,
      snmpCommunity: printer.snmpCommunity || 'public'
    });
  }

  cancelEdit(): void {
    this.editingPrinterId = null;
    this.editPrinterForm.reset();
  }

  saveEdit(): void {
    if (!this.editPrinterForm.valid || !this.editingPrinterId) return;

    const printer = this.printers.find(p => p.id === this.editingPrinterId);
    if (!printer) return;

    const formData = this.editPrinterForm.value;
    const updateData: Partial<Printer> = {
      name: formData.name,
      ipAddress: formData.ipAddress,
      model: formData.model,
      printerType: formData.printerType,
      location: formData.location,
      snmpCommunity: formData.snmpCommunity
    };

    this.printerService.updatePrinter(printer.id, updateData).subscribe({
      next: (updated) => {
        const idx = this.printers.findIndex(p => p.id === printer.id);
        if (idx !== -1) this.printers[idx] = { ...this.printers[idx], ...updated };
        this.editingPrinterId = null;
        // After updating fields, immediately refresh status via SNMP
        // so a wrong IP will be detected and status updated.
        try {
          this.refreshPrinterStatus({ ...this.printers[idx] });
        } catch (e) {
          // fallback: just notify
          console.warn('Auto-refresh status failed:', e);
        }
        alert('Printer updated successfully');
      },
      error: (err) => {
        console.error('Error updating printer:', err);
        alert('Failed to update printer');
      }
    });
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }
}
