export interface Printer {
  id: string;
  name: string;
  ipAddress: string;
  model: string;
  location: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  printerType?: 'laser' | 'inkjet';
  snmpProfile: string;
  snmpCommunity?: string;
  tonerLevel?: number;
  inkLevels?: {
    cyan?: number;
    magenta?: number;
    yellow?: number;
    black?: number;
  };
  totalPages?: number;
  lastSeen?: string;
  lastPolled?: string;
  isActive: boolean | string;
  createdAt: string;
  updatedAt: string;
  PrinterMetrics?: PrinterMetrics[];
  detailedInfo?: PrinterDetailedInfo;
}

export interface PrinterDetailedInfo {
  // 1. Printer Information
  productName?: string;
  printerName?: string;
  modelNumber?: string;
  serialNumber?: string;
  engineCycles?: number;

  // 2. Memory Printer
  memory?: {
    onBoard: string;
    totalUsable: string;
  };

  // 3. Event Log
  eventLog?: {
    entriesInUse: number;
    maxEntries: number;
  };

  // 4. Paper Trays and Options
  trays?: {
    defaultPaperSize: string;
    tray1Size: string;
    tray1Type: string;
    tray2Size: string;
    tray2Type: string;
  };

  // 5. Cartridge Information
  cartridge?: {
    supplyLevel: string; // e.g. "Order", "Low", "OK"
    serialNumber: string;
    pagesPrinted: number;
    firstInstallDate: string;
    lastUsedDate: string;
  };
}

export interface PrinterMetrics {
  id: string;
  printerId: string;
  cyanLevel?: number;
  magentaLevel?: number;
  yellowLevel?: number;
  blackLevel?: number;
  tonerLevel?: number;
  paperTrayStatus: string;
  pageCounter: number;
  deviceStatus: string;
  printerType: 'laser' | 'inkjet';
  createdAt: string;
  updatedAt: string;
}

export interface PrinterAlert {
  id: string;
  printerId: string;
  printerName: string;
  alertType: 'toner_low' | 'paper_empty' | 'offline' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  isAcknowledged: number; // 0 = unread, 1 = read
  createdAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string;
}

export interface BulkCheckResult {
  ip: string;
  success: boolean;
  data: {
    connected: boolean;
    reason?: string;
  };
}

export interface BulkCheckResponse {
  success: boolean;
  results: BulkCheckResult[];
}
