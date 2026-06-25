import * as SQLite from 'expo-sqlite';

import type { ResultStatus, ScanRecord } from '../tickets/types';

const db = SQLite.openDatabaseSync('scans.db');

// Schema + indexes. Runs once at module load; safe to re-run.
db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY NOT NULL,
    configId TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    scannedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scans_code ON scans (code, configId);
  CREATE INDEX IF NOT EXISTS idx_scans_time ON scans (scannedAt DESC);
`);

interface ScanRow {
  id: string;
  configId: string;
  code: string;
  type: string;
  status: string;
  message: string;
  scannedAt: string;
}

function toRecord(row: ScanRow): ScanRecord {
  return { ...row, status: row.status as ResultStatus };
}

/** Persist a scan record. */
export function insertScan(record: ScanRecord): void {
  db.runSync(
    `INSERT INTO scans (id, configId, code, type, status, message, scannedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    record.id,
    record.configId,
    record.code,
    record.type,
    record.status,
    record.message,
    record.scannedAt,
  );
}

/**
 * Return the earliest prior scan of `code` for a config, or null if this is the
 * first time it's been seen. Call this BEFORE inserting the current scan.
 */
export function lookupPrevious(code: string, configId: string): ScanRecord | null {
  const row = db.getFirstSync<ScanRow>(
    `SELECT * FROM scans WHERE code = ? AND configId = ? ORDER BY scannedAt ASC LIMIT 1`,
    code,
    configId,
  );
  return row ? toRecord(row) : null;
}

/** List recent scans, newest first. Optionally filter by config. */
export function listScans(options?: { configId?: string; limit?: number }): ScanRecord[] {
  const limit = options?.limit ?? 200;
  const rows = options?.configId
    ? db.getAllSync<ScanRow>(
        `SELECT * FROM scans WHERE configId = ? ORDER BY scannedAt DESC LIMIT ?`,
        options.configId,
        limit,
      )
    : db.getAllSync<ScanRow>(`SELECT * FROM scans ORDER BY scannedAt DESC LIMIT ?`, limit);
  return rows.map(toRecord);
}

/** Delete all scan history. */
export function clearHistory(): void {
  db.execSync(`DELETE FROM scans`);
}
