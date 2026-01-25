import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PrinterMonitoringService {

  httpOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
    // , withCredentials: true
  }

  api_printer = environment.api_printer

  apiUrl = environment.apiUrl

  constructor(
    public http: HttpClient,
  ) { }

  public getPrinters() {
    return new Promise<any>((resolve, reject) => {
      return this.http.get<any>(this.api_printer + 'get-printers', this.httpOptions).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      })
    })
  }

  public addPrinters(param: any) {
    return new Promise<any>((resolve, reject) => {
      return this.http.post<any>(this.api_printer + 'add-printers', param, this.httpOptions).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      })
    })
  }

  public updatePrinters(id: any, param: any) {
    return new Promise<any>((resolve, reject) => {
      return this.http.put<any>(this.api_printer + 'update-printers/' + id, param, this.httpOptions).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      })
    })
  }

  public deletePrinters(param: any) {
    return new Promise<any>((resolve, reject) => {
      return this.http.delete<any>(this.api_printer + 'delete-printers/' + param, this.httpOptions).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      })
    })
  }



  /* 
    SNMP Service
  */

  public testConections(param: any) {
    return new Promise<any>((resolve, reject) => {
      return this.http.post<any>(this.api_printer + 'test-connection', param, this.httpOptions).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      })
    })
  }


  /* 
    Alert Service
  */

  getAlerts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/alerts`);
  }

  acknowledgeAlert(id: string, acknowledgedBy: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/acknowledge/${id}`, { acknowledgedBy });
  }

  triggerMonitoring(): Observable<any> {
    return this.http.post(`${this.apiUrl}/check`, {});
  }

}
