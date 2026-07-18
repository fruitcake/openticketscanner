/**
 * Browser counterpart of `src/tickets/api.ts`. Same request contract (payload
 * shape, POST/GET behaviour, timeout, auth headers) — reimplemented here only
 * because the RN version imports device.ts (expo-constants + MMKV). The RESPONSE
 * shape stays owned exclusively by `parseTicketResponse`, which we reuse as-is.
 */
import type { CodeFormat, TicketConfig } from '../tickets/types';
import { getDeviceId } from './storage.js';

const REQUEST_TIMEOUT_MS = 10_000;

export interface TicketApiResponse {
  httpStatus: number;
  body: unknown;
}

/** Append key/value pairs to a URL's query string, preserving existing params. */
function appendQuery(url: string, params: Record<string, string | undefined>): string {
  const [base, existing = ''] = url.split('#')[0].split('?');
  const search = new URLSearchParams(existing);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Send a scanned code to a config's validation endpoint. Resolves with the HTTP
 * status and parsed body; rejects only on a true transport failure/timeout.
 */
export async function postTicket(
  config: TicketConfig,
  code: string,
  type: CodeFormat | string,
): Promise<TicketApiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const method = config.method ?? 'POST';

  const payload = {
    code,
    type,
    configId: config.id,
    scannerName: config.scannerName,
    deviceId: getDeviceId(),
    scannedAt: new Date().toISOString(),
  };

  // CORS matters in the browser (unlike the native app). `Accept` is a
  // CORS-safelisted header, so a keyless GET stays a "simple" request with no
  // preflight — which is what lets GET mode hit a plain static JSON host (e.g. a
  // gh-pages file). Adding auth headers turns it into a preflighted request, so
  // a keyed endpoint must send the appropriate Access-Control-Allow-* headers.
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
    headers['X-API-Key'] = config.apiKey;
  }

  const url = method === 'GET' ? appendQuery(config.apiUrl, payload) : config.apiUrl;

  const init: RequestInit = { method, headers, signal: controller.signal };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, init);
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON body: leave as raw text; the adapter treats it as an error.
    }
    return { httpStatus: response.status, body: parsed };
  } finally {
    clearTimeout(timeout);
  }
}
