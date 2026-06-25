/**
 * Barcode/QR formats supported by the scanner. These string values map 1:1 to
 * expo-camera's `BarcodeType`, so they can be passed straight into
 * `barcodeScannerSettings.barcodeTypes`.
 */
export const CODE_FORMATS = [
  'qr',
  'ean13',
  'ean8',
  'code128',
  'code39',
  'code93',
  'codabar',
  'itf14',
  'upc_a',
  'upc_e',
  'pdf417',
  'aztec',
  'datamatrix',
] as const;

export type CodeFormat = (typeof CODE_FORMATS)[number];

/** Human-readable labels for each format, used in the config UI. */
export const CODE_FORMAT_LABELS: Record<CodeFormat, string> = {
  qr: 'QR Code',
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  code128: 'Code 128',
  code39: 'Code 39',
  code93: 'Code 93',
  codabar: 'Codabar',
  itf14: 'ITF-14',
  upc_a: 'UPC-A',
  upc_e: 'UPC-E',
  pdf417: 'PDF417',
  aztec: 'Aztec',
  datamatrix: 'Data Matrix',
};

/** A named ticket-mode configuration pointing at a validation endpoint. */
export interface TicketConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  /** Which code formats this config scans for. */
  formats: CodeFormat[];
  /** When true, keep scanning hands-free; otherwise pause until "Continue". */
  continuousMode: boolean;
  /** Ignore the same code if re-seen within this many milliseconds. */
  debounceMs: number;
}

/** Traffic-light outcome of a ticket validation. `error` = could not validate. */
export type ResultStatus = 'green' | 'yellow' | 'red' | 'error';

/** Normalized result rendered in the popup, produced by `parseTicketResponse`. */
export interface ScanResult {
  status: ResultStatus;
  /** Human-readable headline message. */
  message: string;
  /** Arbitrary holder/ticket key-value fields to render as rows. */
  ticket: Record<string, string>;
  /** Original server payload, kept for debugging. */
  raw: unknown;
}

/** A persisted record of a single scan (ticket mode). */
export interface ScanRecord {
  id: string;
  configId: string;
  code: string;
  type: string;
  status: ResultStatus;
  message: string;
  /** ISO 8601 timestamp. */
  scannedAt: string;
}
