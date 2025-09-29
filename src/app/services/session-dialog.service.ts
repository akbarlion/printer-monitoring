import { Injectable } from '@angular/core';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable } from 'rxjs';
import { SessionExpiredComponent } from '../lib/session-expired/session-expired.component';

@Injectable({
  providedIn: 'root'
})
export class SessionDialogService {
  private dialogRef: DynamicDialogRef | null = null;

  constructor(private dialogService: DialogService) { }

  showSessionExpiredDialog(): Observable<'extend' | 'login'> {
    // Prevent multiple dialogs
    if (this.dialogRef) {
      return new Observable(observer => observer.complete());
    }

    this.dialogRef = this.dialogService.open(SessionExpiredComponent, {
      header: 'Session Expired',
      width: '400px',
      closable: false,
      closeOnEscape: false,
      modal: true
    });

    return this.dialogRef.onClose;
  }
}