export interface Printer {
  id: string;
  name: string;
  ipAddress: string;
  model: string;
  location: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  snmpProfile: string;
  snmpCommunity?: string;
  tonerLevel?: number;
  totalPages?: number;
  lastSeen?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrinterMetrics {
  printerId: string;
  tonerLevel: number;
  paperTrayStatus: string;
  pageCounter: number;
  deviceStatus: string;
  timestamp: Date;
}

export interface PrinterAlert {
  id: string;
  printerId: string;
  printerName: string;
  alertType: 'toner_low' | 'paper_empty' | 'offline' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  isAcknowledged: boolean;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}