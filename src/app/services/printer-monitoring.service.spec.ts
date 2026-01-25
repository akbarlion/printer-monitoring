import { TestBed } from '@angular/core/testing';

import { PrinterMonitoringService } from './printer-monitoring.service';

describe('PrinterMonitoringService', () => {
  let service: PrinterMonitoringService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrinterMonitoringService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
