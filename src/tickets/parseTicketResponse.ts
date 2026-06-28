import type { ResultStatus, ScanResult } from './types';

/**
 * Localized fallback messages, used only when the server doesn't supply its own
 * `message`. Injected by the UI so the popup matches the app language; defaults
 * to English so this module stays free of any i18n/runtime imports (and its
 * unit test can call it with no extra arguments).
 */
export interface ResultMessages {
  green: string;
  yellow: string;
  red: string;
  error: string;
  /** May contain a `{{status}}` placeholder for the HTTP status code. */
  serverError: string;
  unexpected: string;
}

export const DEFAULT_MESSAGES: ResultMessages = {
  green: 'Valid ticket',
  yellow: 'Already scanned',
  red: 'Invalid ticket',
  error: 'Could not validate ticket',
  serverError: 'Server error ({{status}})',
  unexpected: 'Unexpected response from server',
};

/**
 * ============================================================================
 *  THE ADAPTER — the ONLY place coupled to your server's response shape.
 * ============================================================================
 *
 * `postTicket()` performs the HTTP POST and hands the parsed JSON body (plus the
 * HTTP status) to this function. It returns a normalized {@link ScanResult} that
 * the rest of the app renders as a green / yellow / red / error popup.
 *
 * >>> To match YOUR API: edit `STATUS_MAP`, `pickStatus`, `pickMessage`, and
 * >>> `pickTicketFields` below. Nothing else in the app needs to change.
 *
 * Default contract this is written against (placeholder until your JSON is
 * wired in):
 *
 *   POST { code, type, configId, scannedAt }
 *   200 -> {
 *     "status": "valid" | "used" | "invalid",   // or boolean `valid`
 *     "message": "Valid – VIP entry",
 *     "ticket": { "name": "...", "type": "...", "gate": "..." }
 *   }
 *
 *   valid   -> green
 *   used    -> yellow
 *   invalid -> red
 *   (anything unrecognized, or HTTP >= 500 / unparriseable) -> error
 */

/** Maps a server status string to a traffic-light color. EDIT FOR YOUR API. */
const STATUS_MAP: Record<string, ResultStatus> = {
  valid: 'green',
  ok: 'green',
  success: 'green',
  used: 'yellow',
  already_scanned: 'yellow',
  duplicate: 'yellow',
  warning: 'yellow',
  invalid: 'red',
  denied: 'red',
  not_found: 'red',
  expired: 'red',
};

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null;
}

/** Determine the traffic-light status from the response body. EDIT FOR YOUR API. */
function pickStatus(body: Json): ResultStatus {
  // Boolean form: { valid: true/false }
  if (typeof body.valid === 'boolean') {
    return body.valid ? 'green' : 'red';
  }
  // String form: { status: "valid" | "used" | ... }
  const raw = body.status ?? body.result ?? body.state;
  if (typeof raw === 'string') {
    const mapped = STATUS_MAP[raw.toLowerCase().trim()];
    if (mapped) return mapped;
  }
  return 'error';
}

/** Pull a human-readable message. EDIT FOR YOUR API. */
function pickMessage(body: Json, status: ResultStatus, messages: ResultMessages): string {
  const candidates = [body.message, body.reason, body.detail, body.title];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  // Sensible (localized) fallbacks per status.
  switch (status) {
    case 'green':
      return messages.green;
    case 'yellow':
      return messages.yellow;
    case 'red':
      return messages.red;
    default:
      return messages.error;
  }
}

/** Extract holder/ticket fields to display as rows. EDIT FOR YOUR API. */
function pickTicketFields(body: Json): Record<string, string> {
  const source = isObject(body.ticket)
    ? body.ticket
    : isObject(body.holder)
      ? body.holder
      : isObject(body.data)
        ? body.data
        : {};
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value == null) continue;
    if (typeof value === 'object') continue; // skip nested objects/arrays
    fields[key] = String(value);
  }
  return fields;
}

/**
 * Normalize a raw API response into a {@link ScanResult}.
 * @param body       The parsed JSON body (or any value if parsing failed).
 * @param httpStatus The HTTP status code, if known.
 */
export function parseTicketResponse(
  body: unknown,
  httpStatus?: number,
  messages: ResultMessages = DEFAULT_MESSAGES,
): ScanResult {
  // Server-side / gateway errors are never a valid ticket outcome.
  if (httpStatus != null && httpStatus >= 500) {
    return {
      status: 'error',
      message: messages.serverError.replace('{{status}}', String(httpStatus)),
      ticket: {},
      raw: body,
    };
  }

  if (!isObject(body)) {
    return {
      status: 'error',
      message: messages.unexpected,
      ticket: {},
      raw: body,
    };
  }

  const status = pickStatus(body);
  return {
    status,
    message: pickMessage(body, status, messages),
    ticket: pickTicketFields(body),
    raw: body,
  };
}

/** Build an error result for a network/transport failure (no response body). */
export function errorResult(message: string, raw?: unknown): ScanResult {
  return { status: 'error', message, ticket: {}, raw };
}
