/**
 * Allowed formats, inlined so this module stays free of runtime local imports
 * (keeps it loadable under `node --test`). `satisfies` guarantees every entry is
 * a valid `CodeFormat`; keep in sync with `CODE_FORMATS` in `./types`.
 */
const ALLOWED_FORMATS = [
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
];
/**
 * Provisioning links — convert a ticket config to/from a shareable URL so a
 * configuration can be copied to another device via a link or QR code.
 *
 * This module is PURE (no React Native imports) so it unit-tests under
 * `node --test`, like `parseTicketResponse.ts`.
 */
export const CONFIGURE_HOST = 'app.openticketscanner.com';
export const CONFIGURE_PATH = 'configure';
export const SCHEME = 'openticketscanner';
export const PAYLOAD_VERSION = 1;
/** Default debounce, duplicated here to keep this module free of RN imports. */
const DEFAULT_DEBOUNCE_MS = 3000;
/** Build a shareable provisioning URL for a config. */
export function buildConfigLink(config, options) {
    const params = [
        ['v', String(PAYLOAD_VERSION)],
        ['name', config.name],
        ['endpoint', config.apiUrl],
        ['formats', config.formats.join(',')],
        ['continuous', config.continuousMode ? '1' : '0'],
        ['debounce', String(config.debounceMs)],
    ];
    // Only emit `method` for the non-default GET, so POST links stay compact.
    if (config.method === 'GET')
        params.push(['method', 'get']);
    if (config.scannerName)
        params.push(['scanner', config.scannerName]);
    if (options.includeKey && config.apiKey)
        params.push(['key', config.apiKey]);
    if (options.skipConfirm)
        params.push(['skipConfirm', 'true']);
    const query = params
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
    const prefix = options.base === 'scheme'
        ? `${SCHEME}://${CONFIGURE_PATH}`
        : `https://${CONFIGURE_HOST}/${CONFIGURE_PATH}`;
    return `${prefix}?${query}`;
}
/** Parse a `key=value&…` query string into a map (pure, RN-safe). */
function parseQuery(query) {
    const out = {};
    for (const pair of query.split('&')) {
        if (!pair)
            continue;
        const eq = pair.indexOf('=');
        const rawKey = eq === -1 ? pair : pair.slice(0, eq);
        const rawVal = eq === -1 ? '' : pair.slice(eq + 1);
        try {
            out[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal.replace(/\+/g, ' '));
        }
        catch {
            // skip malformed pair
        }
    }
    return out;
}
/** Extract just the query portion from a full URL, scheme URL, or bare query. */
function extractQuery(input) {
    const trimmed = input.trim();
    if (!trimmed)
        return null;
    const q = trimmed.indexOf('?');
    if (q === -1)
        return null;
    // Only treat it as a configure payload if it targets the configure path/host,
    // or it's a bare `?query` / `configure?query` with no scheme.
    const head = trimmed.slice(0, q).toLowerCase();
    const looksLikeConfigure = head.includes(CONFIGURE_PATH) || head === '' || head.startsWith('?');
    if (!looksLikeConfigure)
        return null;
    return trimmed.slice(q + 1);
}
function coerceFormats(raw) {
    if (!raw)
        return ['qr'];
    const allowed = new Set(ALLOWED_FORMATS);
    const formats = raw
        .split(',')
        .map((f) => f.trim())
        .filter((f) => allowed.has(f));
    return formats.length > 0 ? formats : ['qr'];
}
function hostOf(url) {
    const m = url.match(/^https?:\/\/([^/?#]+)/i);
    return m ? m[1] : 'Imported config';
}
/**
 * Build a config payload from already-decoded params (e.g. expo-router's
 * `useLocalSearchParams()` for a deeplink). Returns `null` when `endpoint` is
 * missing or not a URL.
 */
export function payloadFromParams(params) {
    const get = (key) => {
        const v = params[key];
        return Array.isArray(v) ? v[0] : v;
    };
    const apiUrl = (get('endpoint') ?? '').trim();
    if (!/^https?:\/\/.+/i.test(apiUrl))
        return null; // endpoint is required + must be a URL
    const debounce = Number.parseInt(get('debounce') ?? '', 10);
    const continuous = get('continuous');
    const isGet = get('method')?.trim().toUpperCase() === 'GET';
    return {
        name: get('name')?.trim() || hostOf(apiUrl),
        apiUrl,
        apiKey: get('key')?.trim() || undefined,
        // Only carry `method` when it's the non-default GET (keeps POST payloads clean).
        ...(isGet ? { method: 'GET' } : {}),
        scannerName: get('scanner')?.trim() || undefined,
        formats: coerceFormats(get('formats')),
        continuousMode: continuous === '1' || continuous === 'true',
        debounceMs: Number.isFinite(debounce) && debounce >= 0 ? debounce : DEFAULT_DEBOUNCE_MS,
    };
}
/**
 * Parse a provisioning link (HTTPS URL, custom-scheme URL, or bare query) into a
 * config payload. Returns `null` when it isn't a valid configure payload — e.g. a
 * normal ticket QR — so callers can reject non-setup codes.
 */
export function parseConfigLink(input) {
    const query = extractQuery(input);
    if (query == null)
        return null;
    return payloadFromParams(parseQuery(query));
}
/**
 * Whether a provisioning payload asked to skip the import-confirmation screen
 * and add the config immediately (`skipConfirm=true` or `1`). This is a
 * directive, not configuration data, so it lives outside {@link ConfigPayload}
 * and is read separately by whichever screen consumes the link.
 */
export function skipConfirmFromParams(params) {
    const raw = params.skipConfirm;
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
    return value === 'true' || value === '1';
}
/** Same as {@link skipConfirmFromParams}, but from a raw link / scheme / bare query. */
export function skipConfirmFromLink(input) {
    const query = extractQuery(input);
    if (query == null)
        return false;
    return skipConfirmFromParams(parseQuery(query));
}
