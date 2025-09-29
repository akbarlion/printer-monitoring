export interface SNMPProfile {
  id: string;
  name: string;
  version: '2c' | '3';
  community?: string;
  username?: string;
  authProtocol?: 'MD5' | 'SHA';
  authPassword?: string;
  privProtocol?: 'DES' | 'AES';
  privPassword?: string;
  port: number;
  timeout: number;
  retries: number;
}

export interface SNMPConfig {
  profile: SNMPProfile;
  oids: string[];
  pollingInterval: number;
}

export interface SnmpRequest {
  ipAddress: string;
  community: string;
  oids: string[];
}

export interface SnmpData {
  success: boolean;
  values?: { [oid: string]: string };
  error?: string;
}

export const PRINTER_OIDS = {
  TONER_LEVEL: '1.3.6.1.2.1.43.11.1.1.6',
  PAPER_TRAY_STATUS: '1.3.6.1.2.1.43.8.2.1.10',
  PAGE_COUNTER: '1.3.6.1.2.1.43.10.2.1.4',
  DEVICE_STATUS: '1.3.6.1.2.1.25.3.2.1.5',
  DEVICE_DESCRIPTION: '1.3.6.1.2.1.1.1.0'
};