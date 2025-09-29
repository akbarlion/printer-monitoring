import { TestBed } from '@angular/core/testing';

import { SnmpService } from './snmp.service';

describe('SnmpService', () => {
  let service: SnmpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SnmpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
