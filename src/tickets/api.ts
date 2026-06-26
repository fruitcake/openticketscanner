import { getAppVersion, getDeviceId } from '../utils/device';
import type { CodeFormat, TicketConfig } from './types';

export interface TicketApiResponse {
  httpStatus: number;
  body: unknown;
}

/** How long to wait for the validation server before giving up. */
const REQUEST_TIMEOUT_MS = 10_000;

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-App-Version': getAppVersion(),
  };
  if (config.apiKey) {
    // Sent both ways so most servers work out of the box; adjust to taste.
    headers.Authorization = `Bearer ${config.apiKey}`;
    headers['X-API-Key'] = config.apiKey;
  }

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code,
        type,
        configId: config.id,
        scannerName: config.scannerName,
        deviceId: getDeviceId(),
        scannedAt: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

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
