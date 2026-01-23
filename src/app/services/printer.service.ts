import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { Printer, PrinterMetrics, PrinterAlert, BulkCheckResponse } from '../interfaces/printer.interface';
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

  getAllPrinters(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getPrinter(id: string): Observable<Printer> {
    return this.http.get<Printer>(`${this.apiUrl}/${id}`);
  }

  createPrinter(printer: Partial<Printer>): Observable<Printer> {
    return this.http.post<Printer>(this.apiUrl, printer);
  }

  /**
   * Create a printer using backend singular endpoint POST /printer
   * Accepts minimal payload: { ip | ipAddress, name?, snmpProfile?, status?, poll?, community? }
   * If `poll: true` the backend may return additional `details` or `details_error` in the response.
   */
  createPrinterServer(payload: any): Observable<any> {
    const baseUrl = environment.api_printer;
    return this.http.post<any>(`${baseUrl}printer`, payload);
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

  getPrinterDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/details`);
  }

  testConnection(printer: Partial<Printer>): Observable<{ success: boolean, message: string }> {
    return this.http.post<{ success: boolean, message: string }>(`${this.apiUrl}/test`, printer);
  }

  /**
   * SNMP test endpoint used for debugging OIDs from FE.
   * POST /printer/test_snmp_oid
   * Payload: { ip, oid, community? }
   * Response: { success, raw_value, cleaned_value }
   */
  testSnmpOid(ip: string, oid: string, community?: string): Observable<{ success: boolean, raw_value: string, cleaned_value: string }> {
    const baseUrl = environment.api_printer;
    const payload: any = { ip, oid };
    if (community) payload.community = community;
    return this.http.post<{ success: boolean, raw_value: string, cleaned_value: string }>(`${baseUrl}printer/test_snmp_oid`, payload);
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



  bulkRefreshViaSNMP(): Observable<any[]> {
    return this.getAllPrinters().pipe(
      switchMap(printers => {
        const targets = printers
          .filter(p => p.ipAddress)
          .map(p => ({
            ip: p.ipAddress,
            community: p.snmpCommunity || 'public'
          }));

        if (!targets.length) return of([]);

        return this.snmpService.bulkQuery(targets);
      })
    );
  }

  private updatePrinterFromSNMP(printerId: string, snmpData: any): Observable<Printer> {
    const updateData = {
      status: this.mapSnmpStatusToPrinterStatus(snmpData.status),
      // Use inkLevels for inkjet, tonerLevel for laser
      ...(snmpData.printerType === 'inkjet' ? {
        inkLevels: {
          cyan: snmpData.cyanLevel,
          magenta: snmpData.magentaLevel,
          yellow: snmpData.yellowLevel,
          black: snmpData.blackLevel
        }
      } : {
        tonerLevel: snmpData.tonerLevel
      }),
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
