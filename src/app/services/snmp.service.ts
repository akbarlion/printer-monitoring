import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SnmpData, SnmpRequest } from '../interfaces/snmp.interface';
import { environment } from '../../environments/environment.development';
import { BulkCheckResponse } from '../interfaces/printer.interface';

@Injectable({
  providedIn: 'root'
})
export class SnmpService {
  private apiUrl = environment.api_printer + 'snmp';

  constructor(
    private http: HttpClient,
  ) { }

  getPrinterData(ipAddress: string, community: string = 'public'): Observable<any> {
    const request = {
      ipAddress,
      community,
    };

    return this.http.post<any>(`${this.apiUrl}/test-full`, request);
  }

  bulkQuery(
    payload: { ip: string; community: string }[]
  ): Observable<BulkCheckResponse[]> {
    return this.http.post<BulkCheckResponse[]>(
      `${this.apiUrl}/bulk-query`,
      payload,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        })
      }
    );
  }

  bulkCheckConnection(
    payload: { ip: string; community: string }[]
  ): Observable<BulkCheckResponse> {
    return this.http.post<BulkCheckResponse>(
      `${this.apiUrl}/bulk-check`,
      payload,
      {
        headers: new HttpHeaders({
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        })
      }
    );
  }



  testConnection(ipAddress: string, community: string = 'public'): Observable<{ success: boolean, message: string }> {
    // use environment base URL to respect proxy or deployed API
    const url = `${environment.api_printer}snmp/test-full`;
    return this.http.post<{ success: boolean, message: string }>(url, {
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
