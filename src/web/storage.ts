/**
 * localStorage-backed persistence for the static web scanner — the browser
 * counterparts of the app's MMKV config store and expo-sqlite history.
 *
 * Kept intentionally small: configs are a JSON array, scans a capped JSON array
 * scanned linearly for duplicate lookups (fine for event-day volumes).
 */
import type { ScanRecord, TicketConfig } from '../tickets/types';

const CONFIGS_KEY = 'ots.web.configs';
const SCANS_KEY = 'ots.web.scans';
const DEVICE_ID_KEY = 'ots.web.deviceId';
const HIDE_BANNER_KEY = 'ots.web.hideBanner';

/** Keep history bounded so localStorage never fills up on a long event. */
const MAX_SCANS = 2000;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded / private mode: nothing we can do but keep running.
  }
}

/** Generate a random id (crypto.randomUUID with a Math-free-ish fallback). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// -- Configs -----------------------------------------------------------------

export function loadConfigs(): TicketConfig[] {
  const list = read<TicketConfig[]>(CONFIGS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveConfigs(configs: TicketConfig[]): void {
  write(CONFIGS_KEY, configs);
}

// -- Scan history ------------------------------------------------------------

export function loadScans(): ScanRecord[] {
  const list = read<ScanRecord[]>(SCANS_KEY, []);
  return Array.isArray(list) ? list : [];
}

/** Append a scan, newest first, trimming to {@link MAX_SCANS}. */
export function insertScan(record: ScanRecord): void {
  const scans = loadScans();
  scans.unshift(record);
  if (scans.length > MAX_SCANS) scans.length = MAX_SCANS;
  write(SCANS_KEY, scans);
}

/**
 * Earliest prior sighting of `code` for a config, or null if unseen. Mirrors the
 * app's `lookupPrevious`; call BEFORE inserting the current scan.
 */
export function lookupPrevious(code: string, configId: string): ScanRecord | null {
  let earliest: ScanRecord | null = null;
  for (const s of loadScans()) {
    if (s.code === code && s.configId === configId) {
      if (!earliest || s.scannedAt < earliest.scannedAt) earliest = s;
    }
  }
  return earliest;
}

export function listScans(configId: string, limit = 200): ScanRecord[] {
  return loadScans()
    .filter((s) => s.configId === configId)
    .slice(0, limit);
}

export function clearHistory(configId: string): void {
  write(SCANS_KEY, loadScans().filter((s) => s.configId !== configId));
}

// -- Device id + banner ------------------------------------------------------

export function getDeviceId(): string {
  let id = read<string>(DEVICE_ID_KEY, '');
  if (!id) {
    id = `${uid()}-${uid()}`;
    write(DEVICE_ID_KEY, id);
  }
  return id;
}

export function isBannerHidden(): boolean {
  return read<string>(HIDE_BANNER_KEY, '') === '1';
}

export function hideBanner(): void {
  write(HIDE_BANNER_KEY, '1');
}
