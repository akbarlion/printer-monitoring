import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { Printer, PrinterMetrics, PrinterAlert } from '../interfaces/printer.interface';
import { SnmpService } from './snmp.service';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class PrinterService {
  private apiUrl = environment.api_printer + 'printers';

  constructor(
    private http: HttpClient,
    private snmpService: SnmpService
  ) { }

  getAllPrinters(): Observable<Printer[]> {
    return this.http.get<Printer[]>(this.apiUrl);
  }

  getPrinter(id: string): Observable<Printer> {
    return this.http.get<Printer>(`${this.apiUrl}/${id}`);
  }

  createPrinter(printer: Partial<Printer>): Observable<Printer> {
    return this.http.post<Printer>(this.apiUrl, printer);
  }

  updatePrinter(id: string, printer: Partial<Printer>): Observable<Printer> {
    return this.http.put<Printer>(`${this.apiUrl}/${id}`, printer);
  }

  deletePrinter(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getPrinterMetrics(id: string): Observable<PrinterMetrics> {
    return this.http.get<PrinterMetrics>(`${this.apiUrl}/${id}/metrics`);
  }

  getPrinterAlerts(id?: string): Observable<PrinterAlert[]> {
    const baseUrl = environment.api_printer;
    const url = id ? `${this.apiUrl}/${id}/alerts` : `${baseUrl}alerts`;
    return this.http.get<PrinterAlert[]>(url);
  }

  acknowledgeAlert(alertId: string): Observable<void> {
    const baseUrl = environment.api_printer;
    return this.http.put<void>(`${baseUrl}alerts/${alertId}/acknowledge`, {});
  }

  testConnection(printer: Partial<Printer>): Observable<{ success: boolean, message: string }> {
    return this.http.post<{ success: boolean, message: string }>(`${this.apiUrl}/test`, printer);
  }

  // SNMP Integration Methods
  refreshPrinterDataViaSNMP(printerId: string): Observable<Printer> {
    return this.getPrinter(printerId).pipe(
      map(printer => {
        if (printer.ipAddress) {
          this.snmpService.getPrinterData(printer.ipAddress, printer.snmpCommunity)
            .subscribe({
              next: (snmpData) => {
                const parsedData = this.snmpService.parseSnmpData(snmpData);
                this.updatePrinterFromSNMP(printerId, parsedData).subscribe();
              },
              error: (error) => console.error('SNMP Error:', error)
            });
        }
        return printer;
      })
    );
  }

  bulkRefreshViaSNMP(): Observable<Printer[]> {
    return this.getAllPrinters().pipe(
      map(printers => {
        const snmpPrinters = printers
          .filter(p => p.ipAddress)
          .map(p => ({ ip: p.ipAddress!, community: p.snmpCommunity || 'public' }));

        if (snmpPrinters.length > 0) {
          this.snmpService.bulkQuery(snmpPrinters).subscribe({
            next: (results) => {
              results.forEach((result, index) => {
                const printer = printers[index];
                if (printer && result) {
                  const parsedData = this.snmpService.parseSnmpData(result);
                  this.updatePrinterFromSNMP(printer.id, parsedData).subscribe();
                }
              });
            },
            error: (error) => console.error('Bulk SNMP Error:', error)
          });
        }
        return printers;
      })
    );
  }

  private updatePrinterFromSNMP(printerId: string, snmpData: any): Observable<Printer> {
    const updateData = {
      status: this.mapSnmpStatusToPrinterStatus(snmpData.status),
      tonerLevel: snmpData.tonerLevel,
      totalPages: snmpData.totalPages,
      lastSeen: new Date().toISOString()
    };

    return this.updatePrinter(printerId, updateData);
  }

  private mapSnmpStatusToPrinterStatus(snmpStatus: string): 'online' | 'offline' | 'warning' | 'error' {
    switch (snmpStatus) {
      case 'idle': return 'online';
      case 'printing': return 'online';
      case 'warmup': return 'online';
      case 'unknown': return 'warning';
      default: return 'offline';
    }
  }
}
