import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PrinterService } from '../services/printer.service';
import { SnmpService } from '../services/snmp.service';
import { Printer } from '../interfaces/printer.interface';

@Component({
  selector: 'app-printer-list',
  templateUrl: './printer-list.component.html',
  styleUrl: './printer-list.component.scss'
})
export class PrinterListComponent implements OnInit {
  printers: Printer[] = [];
  showAddForm = false;
  addPrinterForm: FormGroup;
  isLoading = false;
  testingConnection = false;

  constructor(
    private fb: FormBuilder,
    private printerService: PrinterService,
    private snmpService: SnmpService
  ) {
    this.addPrinterForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      ipAddress: ['', [Validators.required, Validators.pattern(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)]],
      model: ['', Validators.required],
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
        this.printers = printers;
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
      this.addPrinterForm.reset({ snmpCommunity: 'public' });
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
      const formData = this.addPrinterForm.value;
      
      // Test SNMP connection first to determine initial status
      this.snmpService.testConnection(formData.ipAddress, formData.snmpCommunity).subscribe({
        next: (testResult) => {
          const printerData = {
            ...formData,
            status: testResult.success ? 'online' as const : 'offline' as const,
            snmpProfile: 'default',
            isActive: true
          };

          this.printerService.createPrinter(printerData).subscribe({
            next: (printer) => {
              this.printers.push(printer);
              this.toggleAddForm();
              this.isLoading = false;
              const statusMsg = testResult.success ? 'online and ready!' : 'offline (check connection)';
              alert(`Printer added successfully! Status: ${statusMsg}`);
            },
            error: (error) => {
              console.error('Error adding printer:', error);
              alert('Failed to add printer');
              this.isLoading = false;
            }
          });
        },
        error: (error) => {
          // If SNMP test fails, still create printer but as offline
          const printerData = {
            ...formData,
            status: 'offline' as const,
            snmpProfile: 'default',
            isActive: true
          };

          this.printerService.createPrinter(printerData).subscribe({
            next: (printer) => {
              this.printers.push(printer);
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
        const newStatus = result.success ? 'online' : 'offline';
        const updateData = { status: newStatus as 'online' | 'offline' };
        
        this.printerService.updatePrinter(printer.id, updateData).subscribe({
          next: (updatedPrinter) => {
            const index = this.printers.findIndex(p => p.id === printer.id);
            if (index !== -1) {
              this.printers[index] = { ...this.printers[index], ...updatedPrinter };
            }
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

  getStatusClass(status: string): string {
    return `status-${status}`;
  }
}
