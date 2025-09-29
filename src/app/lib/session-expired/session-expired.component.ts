import { Component } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-session-expired',
  templateUrl: './session-expired.component.html',
  styleUrl: './session-expired.component.scss'
})
export class SessionExpiredComponent {

  constructor(private dialogRef: DynamicDialogRef) {}

  extendSession(): void {
    this.dialogRef.close('extend');
  }

  loginAgain(): void {
    this.dialogRef.close('login');
  }
}
