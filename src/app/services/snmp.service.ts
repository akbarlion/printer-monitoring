import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SnmpData, SnmpRequest } from '../interfaces/snmp.interface';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class SnmpService {
  private apiUrl = environment.api_printer + 'snmp';

  constructor(private http: HttpClient) { }

  getPrinterData(ipAddress: string, community: string = 'public'): Observable<SnmpData> {
    const request: SnmpRequest = {
      ipAddress,
      community,
      oids: [
        '1.3.6.1.2.1.25.3.2.1.3.1',
        '1.3.6.1.2.1.43.11.1.1.9.1.1',
        '1.3.6.1.2.1.43.10.2.1.4.1.1',
        '1.3.6.1.2.1.1.1.0',
        '1.3.6.1.2.1.1.5.0',
        '1.3.6.1.2.1.43.5.1.1.11.1'
      ]
    };

    return this.http.post<SnmpData>(`${this.apiUrl}/query`, request);
  }

  bulkQuery(printers: Array<{ ip: string, community?: string }>): Observable<SnmpData[]> {
    return this.http.post<SnmpData[]>(`${this.apiUrl}/bulk-query`, { printers });
  }

  testConnection(ipAddress: string, community: string = 'public'): Observable<{ success: boolean, message: string }> {
    return this.http.post<{ success: boolean, message: string }>('http://localhost/api-printer/api/printers/test', {
      ipAddress,
      community
    });
  }

  parseSnmpData(data: SnmpData): any {
    const parsed = {
      status: 'unknown',
      tonerLevel: 0,
      paperStatus: 'unknown',
      systemName: '',
      totalPages: 0,
      lastUpdated: new Date()
    };

    if (data.values) {
      if (data.values['1.3.6.1.2.1.25.3.2.1.3.1']) {
        const status = parseInt(data.values['1.3.6.1.2.1.25.3.2.1.3.1']);
        parsed.status = this.mapPrinterStatus(status);
      }

      if (data.values['1.3.6.1.2.1.43.11.1.1.9.1.1']) {
        parsed.tonerLevel = parseInt(data.values['1.3.6.1.2.1.43.11.1.1.9.1.1']) || 0;
      }

      if (data.values['1.3.6.1.2.1.1.5.0']) {
        parsed.systemName = data.values['1.3.6.1.2.1.1.5.0'];
      }

      if (data.values['1.3.6.1.2.1.43.5.1.1.11.1']) {
        parsed.totalPages = parseInt(data.values['1.3.6.1.2.1.43.5.1.1.11.1']) || 0;
      }
    }

    return parsed;
  }

  private mapPrinterStatus(status: number): string {
    switch (status) {
      case 1: return 'other';
      case 2: return 'unknown';
      case 3: return 'idle';
      case 4: return 'printing';
      case 5: return 'warmup';
      default: return 'offline';
    }
  }
}
