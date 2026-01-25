// websocket.service.ts
import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket!: WebSocket;
  private alertSubject = new Subject<any>();
  private connectionSubject = new BehaviorSubject<boolean>(false);

  public alerts$ = this.alertSubject.asObservable();
  public connectionStatus$ = this.connectionSubject.asObservable();

  connect() {
    this.socket = new WebSocket('ws://localhost:8080');

    this.socket.onopen = () => {
      this.connectionSubject.next(true);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'printer_alert') {
          this.alertSubject.next(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      this.connectionSubject.next(false);
      setTimeout(() => this.connect(), 5000);
    };

    this.socket.onerror = (error) => {
      this.connectionSubject.next(false);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    this.connectionSubject.next(false);
  }
}
