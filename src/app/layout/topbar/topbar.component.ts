import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { LayoutService } from '../service/app.layout.service';
import { MenuItem, PrimeNGConfig } from 'primeng/api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {

  items!: MenuItem[];

  @ViewChild('menubutton') menuButton!: ElementRef;

  @ViewChild('topbarmenubutton') topbarMenuButton!: ElementRef;

  @ViewChild('topbarmenu') menu!: ElementRef;

  constructor(
    public layoutService: LayoutService,
    private router: Router,
    private primengConfig: PrimeNGConfig,
    private cd: ChangeDetectorRef
  ) { }

  navigateToHome() {
    this.router.navigate(['/dashboard']);
  }

}
