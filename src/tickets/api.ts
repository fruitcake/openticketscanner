import { getAppVersion, getDeviceId } from '../utils/device';
import type { CodeFormat, TicketConfig } from './types';

export interface TicketApiResponse {
  httpStatus: number;
  body: unknown;
}

/** How long to wait for the validation server before giving up. */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Append key/value pairs to a URL's query string, preserving any params already
 * present in `url`. `undefined` values are skipped. Used for GET-mode scans.
 */
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
 * POST a scanned code to a ticket config's validation endpoint.
 *
 * Resolves with the HTTP status and parsed JSON body. Rejects only on a true
 * transport failure (no network, DNS, TLS, timeout) — a non-2xx HTTP response
 * still resolves, so the adapter can interpret server-sent rejection bodies.
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

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-App-Version': getAppVersion(),
  };
  if (config.apiKey) {
    // Sent both ways so most servers work out of the box; adjust to taste.
    headers.Authorization = `Bearer ${config.apiKey}`;
    headers['X-API-Key'] = config.apiKey;
  }

  // GET can't carry a JSON body, so the scan fields ride along as query params.
  // This lets the endpoint be a plain static host (e.g. a fixed JSON file).
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
      // Non-JSON body: leave as raw text; the adapter will treat it as an error.
    }

    return { httpStatus: response.status, body: parsed };
  } finally {
    clearTimeout(timeout);
  }
}
