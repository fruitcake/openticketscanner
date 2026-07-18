/**
 * Open Ticket Scanner — static web version.
 *
 * A dependency-free single-page app: configure a validation endpoint, store it
 * in localStorage, scan tickets with the device camera, and validate them
 * against the same API the native app uses. The server-response contract is
 * owned entirely by the reused `parseTicketResponse` adapter; the provisioning
 * (?endpoint=...) contract is the reused `payloadFromParams`.
 */
import { DEFAULT_MESSAGES, errorResult, parseTicketResponse } from '../tickets/parseTicketResponse.js';
import { payloadFromParams } from '../tickets/configLink.js';
import { CODE_FORMATS, CODE_FORMAT_LABELS } from '../tickets/types.js';
import type { CodeFormat, ScanRecord, ScanResult, TicketConfig } from '../tickets/types.js';
import { formatTime, formatTimestamp } from '../utils/format.js';
import { postTicket } from './api.js';
import { startScanner, type ScannerHandle } from './scanner.js';
import {
  clearHistory,
  getDeviceId,
  hideBanner,
  insertScan,
  isBannerHidden,
  listScans,
  loadConfigs,
  lookupPrevious,
  saveConfigs,
  uid,
} from './storage.js';

// -- Constants ---------------------------------------------------------------

const STORE_IOS = 'https://apps.apple.com/app/id6784664554';
const STORE_ANDROID = 'https://play.google.com/store/apps/details?id=nl.fruitcake.openticketscanner';

const STATUS_COLOR: Record<ScanResult['status'], string> = {
  green: '#16a34a',
  yellow: '#d9a300',
  red: '#dc2626',
  error: '#64748b',
};
const STATUS_LABEL: Record<ScanResult['status'], string> = {
  green: 'VALID',
  yellow: 'WARNING',
  red: 'REJECTED',
  error: 'ERROR',
};

const DEFAULT_DEBOUNCE_MS = 3000;

// -- Tiny DOM helper ---------------------------------------------------------

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'html') node.innerHTML = String(value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (typeof value === 'boolean') {
      if (value) node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) node.append(child);
  return node;
}

function hostOf(url: string): string {
  const m = url.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1] : url;
}

// -- App state ---------------------------------------------------------------

type View =
  | { name: 'list' }
  | { name: 'form'; editingId?: string }
  | { name: 'scan'; configId: string };

let view: View = { name: 'list' };
let configs: TicketConfig[] = loadConfigs();

/** Query string captured at load, used for the "Open in app" deeplink. */
const pendingSearch = location.search;

const root = document.getElementById('app') as HTMLElement;

function setView(next: View): void {
  // Leaving the scanner view: always release the camera.
  if (view.name === 'scan' && next.name !== 'scan') stopScanner();
  view = next;
  render();
}

function persist(): void {
  saveConfigs(configs);
}

// -- Store banner (dismissible) ---------------------------------------------

function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function renderBanner(): HTMLElement | null {
  if (isBannerHidden()) return null;
  const hasDeeplink = /[?&]endpoint=/.test(pendingSearch);
  // Show when it's actually useful: on a phone, or when arriving from a share link.
  if (!isMobile() && !hasDeeplink) return null;

  const ua = navigator.userAgent;
  const storeHref = /Android/i.test(ua) ? STORE_ANDROID : STORE_IOS;
  const storeLabel = /Android/i.test(ua) ? 'Google Play' : 'App Store';

  const actions: HTMLElement[] = [];
  if (hasDeeplink) {
    actions.push(
      el('a', { class: 'banner-btn primary', href: `openticketscanner://configure${pendingSearch}` }, 'Open in app'),
    );
  }
  actions.push(el('a', { class: 'banner-btn', href: storeHref, target: '_blank', rel: 'noopener' }, storeLabel));

  return el(
    'div',
    { class: 'banner' },
    el('img', { class: 'banner-icon', src: '/assets/icon.png', alt: '' }),
    el(
      'div',
      { class: 'banner-text' },
      el('strong', {}, 'Get the native app'),
      el('span', {}, 'Faster scanning, offline history, background sounds.'),
    ),
    el('div', { class: 'banner-actions' }, ...actions),
    el(
      'button',
      {
        class: 'banner-close',
        'aria-label': 'Dismiss',
        onClick: () => {
          hideBanner();
          render();
        },
      },
      '×',
    ),
  );
}

// -- List view ---------------------------------------------------------------

function renderList(): HTMLElement {
  const header = el(
    'header',
    { class: 'topbar' },
    el('h1', {}, 'Open Ticket Scanner'),
    el('button', { class: 'btn primary', onClick: () => setView({ name: 'form' }) }, '+ New'),
  );

  const container = el('div', { class: 'screen' }, header);

  if (configs.length === 0) {
    container.append(
      el(
        'div',
        { class: 'empty' },
        el('p', {}, 'No scanners configured yet.'),
        el(
          'button',
          { class: 'btn primary', onClick: () => setView({ name: 'form' }) },
          'Configure a scanner',
        ),
      ),
    );
    return container;
  }

  const list = el('div', { class: 'card-list' });
  for (const config of configs) {
    list.append(
      el(
        'div',
        { class: 'config-card' },
        el(
          'div',
          { class: 'config-main', onClick: () => setView({ name: 'scan', configId: config.id }) },
          el('strong', {}, config.name),
          el('span', { class: 'muted' }, `${config.method ?? 'POST'} · ${hostOf(config.apiUrl)}`),
        ),
        el(
          'div',
          { class: 'config-actions' },
          el(
            'button',
            { class: 'btn primary', onClick: () => setView({ name: 'scan', configId: config.id }) },
            'Scan',
          ),
          el('button', { class: 'btn ghost', onClick: () => setView({ name: 'form', editingId: config.id }) }, 'Edit'),
        ),
      ),
    );
  }
  container.append(list);
  return container;
}

// -- Config form -------------------------------------------------------------

function renderForm(editingId?: string): HTMLElement {
  const existing = editingId ? configs.find((c) => c.id === editingId) : undefined;

  const nameInput = el('input', { class: 'field', type: 'text', placeholder: 'e.g. Main gate', value: existing?.name ?? '' });
  const urlInput = el('input', {
    class: 'field',
    type: 'url',
    placeholder: 'https://api.example.com/validate',
    value: existing?.apiUrl ?? '',
  });
  const keyInput = el('input', { class: 'field', type: 'text', placeholder: 'Optional', value: existing?.apiKey ?? '' });
  const scannerInput = el('input', {
    class: 'field',
    type: 'text',
    placeholder: 'Optional lane label',
    value: existing?.scannerName ?? '',
  });

  const methodSelect = el('select', { class: 'field' });
  for (const m of ['POST', 'GET'] as const) {
    methodSelect.append(el('option', { value: m, selected: (existing?.method ?? 'POST') === m }, m));
  }

  const debounceInput = el('input', {
    class: 'field',
    type: 'number',
    min: 0,
    step: 500,
    value: String(existing?.debounceMs ?? DEFAULT_DEBOUNCE_MS),
  });

  const continuousInput = el('input', { type: 'checkbox' });
  continuousInput.checked = existing?.continuousMode ?? false;

  // Format checkboxes.
  const selectedFormats = new Set<CodeFormat>(existing?.formats ?? ['qr']);
  const formatBoxes: Record<string, HTMLInputElement> = {};
  const formatGrid = el('div', { class: 'format-grid' });
  for (const fmt of CODE_FORMATS) {
    const box = el('input', { type: 'checkbox' });
    box.checked = selectedFormats.has(fmt);
    formatBoxes[fmt] = box;
    formatGrid.append(el('label', { class: 'format-item' }, box, el('span', {}, CODE_FORMAT_LABELS[fmt])));
  }

  const errorLine = el('p', { class: 'form-error' });

  const save = (): void => {
    const name = nameInput.value.trim();
    const apiUrl = urlInput.value.trim();
    if (!/^https?:\/\/.+/i.test(apiUrl)) {
      errorLine.textContent = 'Enter a valid https:// endpoint URL.';
      return;
    }
    const formats = CODE_FORMATS.filter((f) => formatBoxes[f].checked);
    if (formats.length === 0) {
      errorLine.textContent = 'Select at least one barcode format.';
      return;
    }
    const debounce = Number.parseInt(debounceInput.value, 10);
    const draft: Omit<TicketConfig, 'id'> = {
      name: name || hostOf(apiUrl),
      apiUrl,
      apiKey: keyInput.value.trim() || undefined,
      method: (methodSelect.value as TicketConfig['method']) === 'GET' ? 'GET' : 'POST',
      scannerName: scannerInput.value.trim() || undefined,
      formats,
      continuousMode: continuousInput.checked,
      debounceMs: Number.isFinite(debounce) && debounce >= 0 ? debounce : DEFAULT_DEBOUNCE_MS,
    };

    if (existing) {
      configs = configs.map((c) => (c.id === existing.id ? { ...draft, id: existing.id } : c));
    } else {
      configs = [...configs, { ...draft, id: uid() }];
    }
    persist();
    setView({ name: 'list' });
  };

  const field = (label: string, control: HTMLElement, hint?: string): HTMLElement =>
    el('label', { class: 'form-row' }, el('span', { class: 'form-label' }, label), control, hint ? el('span', { class: 'form-hint' }, hint) : '');

  const container = el(
    'div',
    { class: 'screen' },
    el(
      'header',
      { class: 'topbar' },
      el('button', { class: 'btn ghost', onClick: () => setView({ name: 'list' }) }, '← Back'),
      el('h1', {}, existing ? 'Edit scanner' : 'New scanner'),
      el('span', {}),
    ),
    field('Name', nameInput),
    field('Validation endpoint', urlInput),
    field('Method', methodSelect, 'GET appends scan fields as query params (works with a static endpoint).'),
    field('API key', keyInput, 'Sent as Bearer + X-API-Key.'),
    field('Scanner / lane name', scannerInput),
    field('Formats', formatGrid),
    field('Re-scan debounce (ms)', debounceInput),
    el('label', { class: 'form-row inline' }, continuousInput, el('span', {}, 'Continuous mode (hands-free; valid scans auto-resume)')),
    errorLine,
    el(
      'div',
      { class: 'form-buttons' },
      el('button', { class: 'btn primary', onClick: save }, existing ? 'Save changes' : 'Create'),
      existing
        ? el(
            'button',
            {
              class: 'btn danger',
              onClick: () => {
                if (confirm(`Delete "${existing.name}"? Its scan history stays until cleared.`)) {
                  configs = configs.filter((c) => c.id !== existing.id);
                  persist();
                  setView({ name: 'list' });
                }
              },
            },
            'Delete',
          )
        : '',
    ),
  );
  return container;
}

// -- Scanner view ------------------------------------------------------------

let scanner: ScannerHandle | null = null;
let busy = false;

function stopScanner(): void {
  scanner?.stop();
  scanner = null;
  busy = false;
}

function renderScan(configId: string): HTMLElement {
  const config = configs.find((c) => c.id === configId);
  if (!config) {
    setView({ name: 'list' });
    return el('div');
  }

  const videoWrap = el('div', { class: 'video-wrap' });
  const overlayHost = el('div', { class: 'overlay-host' });
  const statusLine = el('div', { class: 'scan-status' }, 'Point the camera at a ticket');

  const container = el(
    'div',
    { class: 'scan-screen' },
    el(
      'header',
      { class: 'topbar scan-topbar' },
      el('button', { class: 'btn ghost', onClick: () => setView({ name: 'list' }) }, '← Back'),
      el('h1', {}, config.name),
      el('button', { class: 'btn ghost', onClick: () => openHistory(config) }, 'History'),
    ),
    videoWrap,
    statusLine,
    el(
      'div',
      { class: 'scan-actions' },
      el('button', { class: 'btn ghost', onClick: () => promptManual(config, handleScan) }, 'Enter code manually'),
    ),
    overlayHost,
  );

  // -- Result overlay -------------------------------------------------------
  const showResult = (result: ScanResult, code: string, previous: ScanRecord | null): void => {
    const color = STATUS_COLOR[result.status];
    const fields = Object.entries(result.ticket);

    const dismiss = (): void => {
      overlayHost.replaceChildren();
      busy = false;
    };

    const card = el(
      'div',
      { class: 'result-card', style: `border-color:${color}` },
      el('div', { class: 'result-banner', style: `background:${color}` }, STATUS_LABEL[result.status]),
      el(
        'div',
        { class: 'result-body' },
        el('p', { class: 'result-message' }, result.message),
        ...(fields.length
          ? [el('div', { class: 'result-fields' }, ...fields.map(([k, v]) => el('div', { class: 'result-field' }, el('span', { class: 'muted' }, k), el('span', {}, v))))]
          : []),
        ...(previous
          ? [el('div', { class: 'result-prev' }, el('span', { class: 'prev-label' }, 'Previously scanned'), el('span', {}, formatTimestamp(previous.scannedAt)))]
          : []),
        el('code', { class: 'result-code' }, code),
      ),
      el('button', { class: 'btn result-continue', style: `background:${color}`, onClick: dismiss }, 'Continue scanning'),
    );

    overlayHost.replaceChildren(el('div', { class: 'overlay-backdrop' }, card));

    // Continuous mode: a valid scan auto-dismisses so scanning never stops.
    if (config.continuousMode && result.status === 'green') {
      busy = false;
      setTimeout(() => {
        // Only clear if this same overlay is still showing.
        if (overlayHost.contains(card)) overlayHost.replaceChildren();
      }, 2500);
    }
  };

  // -- Scan handler ---------------------------------------------------------
  async function handleScan(code: string, type: string): Promise<void> {
    if (busy) return;
    busy = true;
    statusLine.textContent = 'Validating…';

    const previous = lookupPrevious(code, config!.id);

    let result: ScanResult;
    try {
      const res = await postTicket(config!, code, type);
      result = parseTicketResponse(res.body, res.httpStatus, DEFAULT_MESSAGES);
    } catch (e) {
      const msg = e instanceof Error && e.name === 'AbortError' ? 'Validation timed out.' : 'Network error — could not reach the server.';
      result = errorResult(msg, e);
    }

    insertScan({
      id: uid(),
      configId: config!.id,
      code,
      type,
      status: result.status,
      message: result.message,
      scannedAt: new Date().toISOString(),
    });

    statusLine.textContent = 'Point the camera at a ticket';
    showResult(result, code, previous);
  }

  // -- Start camera ---------------------------------------------------------
  stopScanner();
  startScanner({
    formats: config.formats,
    debounceMs: config.debounceMs,
    onScan: (code, type) => void handleScan(code, type),
    onError: (message) => {
      statusLine.textContent = message;
    },
  })
    .then((handle) => {
      scanner = handle;
      handle.video.className = 'scan-video';
      videoWrap.replaceChildren(handle.video);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      const denied = /denied|permission|NotAllowed/i.test(message);
      videoWrap.replaceChildren(
        el(
          'div',
          { class: 'camera-error' },
          el('p', {}, denied ? 'Camera access was blocked.' : 'Could not start the camera.'),
          el('p', { class: 'muted' }, 'Grant camera permission (needs HTTPS), or enter codes manually below.'),
        ),
      );
    });

  return container;
}

// -- Manual entry + history (lightweight prompts) ----------------------------

function promptManual(config: TicketConfig, onScan: (code: string, type: string) => void): void {
  const code = prompt(`Enter a code to validate for "${config.name}":`);
  if (code && code.trim()) onScan(code.trim(), 'manual');
}

function openHistory(config: TicketConfig): void {
  const scans = listScans(config.id, 200);
  const host = el('div', { class: 'overlay-backdrop' });
  const close = (): void => host.remove();

  const rows = scans.length
    ? scans.map((s) =>
        el(
          'div',
          { class: 'history-row', style: `border-left-color:${STATUS_COLOR[s.status]}` },
          el('div', { class: 'history-code' }, s.code),
          el('div', { class: 'history-meta' }, el('span', { class: 'muted' }, s.message), el('span', { class: 'muted' }, formatTime(s.scannedAt))),
        ),
      )
    : [el('p', { class: 'muted' }, 'No scans yet.')];

  host.append(
    el(
      'div',
      { class: 'history-card' },
      el(
        'header',
        { class: 'topbar' },
        el('h1', {}, 'History'),
        el('button', { class: 'btn ghost', onClick: close }, 'Close'),
      ),
      el('div', { class: 'history-list' }, ...rows),
      el(
        'button',
        {
          class: 'btn danger',
          onClick: () => {
            if (confirm('Clear all scan history for this scanner?')) {
              clearHistory(config.id);
              close();
            }
          },
        },
        'Clear history',
      ),
    ),
  );
  document.body.append(host);
}

// -- Render ------------------------------------------------------------------

function render(): void {
  const banner = view.name === 'scan' ? null : renderBanner();
  let screen: HTMLElement;
  switch (view.name) {
    case 'list':
      screen = renderList();
      break;
    case 'form':
      screen = renderForm(view.editingId);
      break;
    case 'scan':
      screen = renderScan(view.configId);
      break;
  }
  root.replaceChildren(...(banner ? [banner, screen] : [screen]));
}

// -- Boot --------------------------------------------------------------------

function importDeeplinkConfig(): void {
  if (!location.search) return;
  const params = Object.fromEntries(new URLSearchParams(location.search).entries());
  const payload = payloadFromParams(params);
  if (!payload) return;

  // De-dupe: same endpoint + name already configured -> skip.
  const dupe = configs.find((c) => c.apiUrl === payload.apiUrl && c.name === payload.name);
  if (!dupe) {
    configs = [...configs, { ...payload, id: uid() }];
    persist();
  }
  // Clean the URL so a refresh doesn't re-import (pendingSearch keeps the params
  // for the banner's "Open in app" deeplink).
  history.replaceState(null, '', location.pathname);
}

getDeviceId(); // ensure a stable device id exists from first load
importDeeplinkConfig();
render();
