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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  PrinterMetrics?: PrinterMetrics[];
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