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
import { parseConfigLink, payloadFromParams, skipConfirmFromLink, skipConfirmFromParams, } from '../tickets/configLink.js';
import { CODE_FORMATS, CODE_FORMAT_LABELS } from '../tickets/types.js';
import { formatTime, formatTimestamp } from '../utils/format.js';
import { postTicket } from './api.js';
import { startScanner } from './scanner.js';
import { clearHistory, getDeviceId, hideBanner, insertScan, isBannerHidden, listScans, loadConfigs, lookupPrevious, saveConfigs, uid, } from './storage.js';
// -- Constants ---------------------------------------------------------------
const STORE_IOS = 'https://apps.apple.com/app/id6784664554';
const STORE_ANDROID = 'https://play.google.com/store/apps/details?id=nl.fruitcake.openticketscanner';
const STATUS_COLOR = {
    green: '#16a34a',
    yellow: '#d9a300',
    red: '#dc2626',
    error: '#64748b',
};
const STATUS_LABEL = {
    green: 'VALID',
    yellow: 'WARNING',
    red: 'REJECTED',
    error: 'ERROR',
};
const DEFAULT_DEBOUNCE_MS = 3000;
function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === false)
            continue;
        if (key === 'class')
            node.className = String(value);
        else if (key === 'html')
            node.innerHTML = String(value);
        else if (key.startsWith('on') && typeof value === 'function') {
            node.addEventListener(key.slice(2).toLowerCase(), value);
        }
        else if (typeof value === 'boolean') {
            if (value)
                node.setAttribute(key, '');
        }
        else {
            node.setAttribute(key, String(value));
        }
    }
    for (const child of children)
        node.append(child);
    return node;
}
function hostOf(url) {
    const m = url.match(/^https?:\/\/([^/?#]+)/i);
    return m ? m[1] : url;
}
let view = { name: 'list' };
let configs = loadConfigs();
/** Views that hold the camera open (so we release it on the way out). */
function isCameraView(v) {
    return v.name === 'scan' || v.name === 'setup' || v.name === 'quick';
}
/** Query string captured at load, used for the "Open in app" deeplink. */
const pendingSearch = location.search;
const root = document.getElementById('app');
function setView(next) {
    // Leaving a camera view: always release the camera (the next camera view
    // re-acquires it in its own render).
    if (isCameraView(view))
        stopScanner();
    view = next;
    render();
}
function persist() {
    saveConfigs(configs);
}
/** Add a config, or update the existing one with the same endpoint (skipConfirm path). */
function upsertConfig(payload) {
    const existing = configs.find((c) => c.apiUrl === payload.apiUrl);
    configs = existing
        ? configs.map((c) => (c.id === existing.id ? { ...payload, id: existing.id } : c))
        : [...configs, { ...payload, id: uid() }];
    persist();
}
// -- Store banner (dismissible) ---------------------------------------------
function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
function renderBanner() {
    if (isBannerHidden())
        return null;
    const hasDeeplink = /[?&]endpoint=/.test(pendingSearch);
    // Show when it's actually useful: on a phone, or when arriving from a share link.
    if (!isMobile() && !hasDeeplink)
        return null;
    const ua = navigator.userAgent;
    const storeHref = /Android/i.test(ua) ? STORE_ANDROID : STORE_IOS;
    const storeLabel = /Android/i.test(ua) ? 'Google Play' : 'App Store';
    const actions = [];
    if (hasDeeplink) {
        actions.push(el('a', { class: 'banner-btn primary', href: `openticketscanner://configure${pendingSearch}` }, 'Open in app'));
    }
    actions.push(el('a', { class: 'banner-btn', href: storeHref, target: '_blank', rel: 'noopener' }, storeLabel));
    return el('div', { class: 'banner' }, el('img', { class: 'banner-icon', src: '/assets/icon.png', alt: '' }), el('div', { class: 'banner-text' }, el('strong', {}, 'Get the native app'), el('span', {}, 'Faster scanning, offline history, background sounds.')), el('div', { class: 'banner-actions' }, ...actions), el('button', {
        class: 'banner-close',
        'aria-label': 'Dismiss',
        onClick: () => {
            hideBanner();
            render();
        },
    }, '×'));
}
// -- List view ---------------------------------------------------------------
function renderList() {
    const header = el('header', { class: 'topbar' }, el('h1', {}, 'Open Ticket Scanner'), el('button', { class: 'btn primary', onClick: () => setView({ name: 'form' }) }, '+ New'));
    const container = el('div', { class: 'screen' }, header);
    // Camera entry points that don't need an existing config.
    const tools = el('div', { class: 'home-tools' }, el('button', { class: 'btn ghost', onClick: () => setView({ name: 'setup' }) }, 'Scan setup code'), el('button', { class: 'btn ghost', onClick: () => setView({ name: 'quick' }) }, 'Quick scan (no validation)'));
    if (configs.length === 0) {
        container.append(el('div', { class: 'empty' }, el('p', {}, 'No scanners configured yet.'), el('button', { class: 'btn primary', onClick: () => setView({ name: 'form' }) }, 'Configure a scanner'), el('p', { class: 'muted' }, 'or set one up by scanning a QR:')), tools);
        return container;
    }
    const list = el('div', { class: 'card-list' });
    for (const config of configs) {
        list.append(el('div', { class: 'config-card' }, el('div', { class: 'config-main', onClick: () => setView({ name: 'scan', configId: config.id }) }, el('strong', {}, config.name), el('span', { class: 'muted' }, `${config.method ?? 'POST'} · ${hostOf(config.apiUrl)}`)), el('div', { class: 'config-actions' }, el('button', { class: 'btn primary', onClick: () => setView({ name: 'scan', configId: config.id }) }, 'Scan'), el('button', { class: 'btn ghost', onClick: () => setView({ name: 'form', editingId: config.id }) }, 'Edit'))));
    }
    container.append(list, tools);
    return container;
}
// -- Config form -------------------------------------------------------------
function renderForm(editingId) {
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
    for (const m of ['POST', 'GET']) {
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
    const selectedFormats = new Set(existing?.formats ?? ['qr']);
    const formatBoxes = {};
    const formatGrid = el('div', { class: 'format-grid' });
    for (const fmt of CODE_FORMATS) {
        const box = el('input', { type: 'checkbox' });
        box.checked = selectedFormats.has(fmt);
        formatBoxes[fmt] = box;
        formatGrid.append(el('label', { class: 'format-item' }, box, el('span', {}, CODE_FORMAT_LABELS[fmt])));
    }
    const errorLine = el('p', { class: 'form-error' });
    const save = () => {
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
        const draft = {
            name: name || hostOf(apiUrl),
            apiUrl,
            apiKey: keyInput.value.trim() || undefined,
            method: methodSelect.value === 'GET' ? 'GET' : 'POST',
            scannerName: scannerInput.value.trim() || undefined,
            formats,
            continuousMode: continuousInput.checked,
            debounceMs: Number.isFinite(debounce) && debounce >= 0 ? debounce : DEFAULT_DEBOUNCE_MS,
        };
        if (existing) {
            configs = configs.map((c) => (c.id === existing.id ? { ...draft, id: existing.id } : c));
        }
        else {
            configs = [...configs, { ...draft, id: uid() }];
        }
        persist();
        setView({ name: 'list' });
    };
    const field = (label, control, hint) => el('label', { class: 'form-row' }, el('span', { class: 'form-label' }, label), control, hint ? el('span', { class: 'form-hint' }, hint) : '');
    const container = el('div', { class: 'screen' }, el('header', { class: 'topbar' }, el('button', { class: 'btn ghost', onClick: () => setView({ name: 'list' }) }, '← Back'), el('h1', {}, existing ? 'Edit scanner' : 'New scanner'), el('span', {})), field('Name', nameInput), field('Validation endpoint', urlInput), field('Method', methodSelect, 'GET appends scan fields as query params (works with a static endpoint).'), field('API key', keyInput, 'Sent as Bearer + X-API-Key.'), field('Scanner / lane name', scannerInput), field('Formats', formatGrid), field('Re-scan debounce (ms)', debounceInput), el('label', { class: 'form-row inline' }, continuousInput, el('span', {}, 'Continuous mode (hands-free; valid scans auto-resume)')), errorLine, el('div', { class: 'form-buttons' }, el('button', { class: 'btn primary', onClick: save }, existing ? 'Save changes' : 'Create'), existing
        ? el('button', {
            class: 'btn danger',
            onClick: () => {
                if (confirm(`Delete "${existing.name}"? Its scan history stays until cleared.`)) {
                    configs = configs.filter((c) => c.id !== existing.id);
                    persist();
                    setView({ name: 'list' });
                }
            },
        }, 'Delete')
        : ''));
    return container;
}
// -- Scanner view ------------------------------------------------------------
let scanner = null;
let busy = false;
function stopScanner() {
    scanner?.stop();
    scanner = null;
    busy = false;
}
/** Build the "camera unavailable" placeholder shown when the camera won't start. */
function cameraErrorNode(err) {
    const message = err instanceof Error ? err.message : String(err);
    const denied = /denied|permission|NotAllowed/i.test(message);
    return el('div', { class: 'camera-error' }, el('p', {}, denied ? 'Camera access was blocked.' : 'Could not start the camera.'), el('p', { class: 'muted' }, 'Grant camera permission (needs HTTPS).'));
}
/**
 * Start the camera into `videoWrap`, wiring the live <video> or an error
 * placeholder. Shared by the ticket-scan, setup-scan and quick-scan views.
 */
function startCameraInto(videoWrap, opts) {
    stopScanner();
    startScanner(opts)
        .then((handle) => {
        scanner = handle;
        handle.video.className = 'scan-video';
        videoWrap.replaceChildren(handle.video);
    })
        .catch((err) => {
        videoWrap.replaceChildren(cameraErrorNode(err));
    });
}
function renderScan(configId) {
    const config = configs.find((c) => c.id === configId);
    if (!config) {
        setView({ name: 'list' });
        return el('div');
    }
    const videoWrap = el('div', { class: 'video-wrap' });
    const overlayHost = el('div', { class: 'overlay-host' });
    const statusLine = el('div', { class: 'scan-status' }, 'Point the camera at a ticket');
    const container = el('div', { class: 'scan-screen' }, el('header', { class: 'topbar scan-topbar' }, el('button', { class: 'btn ghost', onClick: () => setView({ name: 'list' }) }, '← Back'), el('h1', {}, config.name), el('button', { class: 'btn ghost', onClick: () => openHistory(config) }, 'History')), videoWrap, statusLine, el('div', { class: 'scan-actions' }, el('button', { class: 'btn ghost', onClick: () => promptManual(config, handleScan) }, 'Enter code manually')), overlayHost);
    // -- Result overlay -------------------------------------------------------
    const showResult = (result, code, previous) => {
        const color = STATUS_COLOR[result.status];
        const fields = Object.entries(result.ticket);
        const dismiss = () => {
            overlayHost.replaceChildren();
            busy = false;
        };
        const card = el('div', { class: 'result-card', style: `border-color:${color}` }, el('div', { class: 'result-banner', style: `background:${color}` }, STATUS_LABEL[result.status]), el('div', { class: 'result-body' }, el('p', { class: 'result-message' }, result.message), ...(fields.length
            ? [el('div', { class: 'result-fields' }, ...fields.map(([k, v]) => el('div', { class: 'result-field' }, el('span', { class: 'muted' }, k), el('span', {}, v))))]
            : []), ...(previous
            ? [el('div', { class: 'result-prev' }, el('span', { class: 'prev-label' }, 'Previously scanned'), el('span', {}, formatTimestamp(previous.scannedAt)))]
            : []), el('code', { class: 'result-code' }, code)), el('button', { class: 'btn result-continue', style: `background:${color}`, onClick: dismiss }, 'Continue scanning'));
        overlayHost.replaceChildren(el('div', { class: 'overlay-backdrop' }, card));
        // Continuous mode: a valid scan auto-dismisses so scanning never stops.
        if (config.continuousMode && result.status === 'green') {
            busy = false;
            setTimeout(() => {
                // Only clear if this same overlay is still showing.
                if (overlayHost.contains(card))
                    overlayHost.replaceChildren();
            }, 2500);
        }
    };
    // -- Scan handler ---------------------------------------------------------
    async function handleScan(code, type) {
        if (busy)
            return;
        busy = true;
        statusLine.textContent = 'Validating…';
        const previous = lookupPrevious(code, config.id);
        let result;
        try {
            const res = await postTicket(config, code, type);
            result = parseTicketResponse(res.body, res.httpStatus, DEFAULT_MESSAGES);
        }
        catch (e) {
            const msg = e instanceof Error && e.name === 'AbortError' ? 'Validation timed out.' : 'Network error — could not reach the server.';
            result = errorResult(msg, e);
        }
        insertScan({
            id: uid(),
            configId: config.id,
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
    startCameraInto(videoWrap, {
        formats: config.formats,
        debounceMs: config.debounceMs,
        onScan: (code, type) => void handleScan(code, type),
        onError: (message) => {
            statusLine.textContent = message;
        },
    });
    return container;
}
// -- Manual entry + history (lightweight prompts) ----------------------------
function promptManual(config, onScan) {
    const code = prompt(`Enter a code to validate for "${config.name}":`);
    if (code && code.trim())
        onScan(code.trim(), 'manual');
}
function openHistory(config) {
    const scans = listScans(config.id, 200);
    const host = el('div', { class: 'overlay-backdrop' });
    const close = () => host.remove();
    const rows = scans.length
        ? scans.map((s) => el('div', { class: 'history-row', style: `border-left-color:${STATUS_COLOR[s.status]}` }, el('div', { class: 'history-code' }, s.code), el('div', { class: 'history-meta' }, el('span', { class: 'muted' }, s.message), el('span', { class: 'muted' }, formatTime(s.scannedAt)))))
        : [el('p', { class: 'muted' }, 'No scans yet.')];
    host.append(el('div', { class: 'history-card' }, el('header', { class: 'topbar' }, el('h1', {}, 'History'), el('button', { class: 'btn ghost', onClick: close }, 'Close')), el('div', { class: 'history-list' }, ...rows), el('button', {
        class: 'btn danger',
        onClick: () => {
            if (confirm('Clear all scan history for this scanner?')) {
                clearHistory(config.id);
                close();
            }
        },
    }, 'Clear history')));
    document.body.append(host);
}
// -- Import confirmation (from a link or scanned setup QR) -------------------
function renderImport(payload) {
    const existing = configs.find((c) => c.apiUrl === payload.apiUrl);
    const row = (label, value) => el('div', { class: 'result-field' }, el('span', { class: 'muted' }, label), el('span', {}, value));
    const summary = el('div', { class: 'result-fields' }, row('Name', payload.name), row('Endpoint', payload.apiUrl), row('Method', payload.method ?? 'POST'), row('Formats', payload.formats.map((f) => CODE_FORMAT_LABELS[f]).join(', ')), row('Continuous', payload.continuousMode ? 'On' : 'Off'));
    if (payload.scannerName)
        summary.append(row('Scanner', payload.scannerName));
    if (payload.apiKey)
        summary.append(row('API key', 'included in link'));
    const addNew = () => {
        configs = [...configs, { ...payload, id: uid() }];
        persist();
        setView({ name: 'list' });
    };
    const updateExisting = () => {
        if (!existing)
            return addNew();
        configs = configs.map((c) => (c.id === existing.id ? { ...payload, id: existing.id } : c));
        persist();
        setView({ name: 'list' });
    };
    const buttons = existing
        ? [
            el('button', { class: 'btn primary', onClick: updateExisting }, `Update "${existing.name}"`),
            el('button', { class: 'btn ghost', onClick: addNew }, 'Add as new'),
        ]
        : [el('button', { class: 'btn primary', onClick: addNew }, 'Add scanner')];
    buttons.push(el('button', { class: 'btn ghost', onClick: () => setView({ name: 'list' }) }, 'Cancel'));
    return el('div', { class: 'screen' }, el('header', { class: 'topbar' }, el('button', { class: 'btn ghost', onClick: () => setView({ name: 'list' }) }, '← Back'), el('h1', {}, 'Set up this scanner'), el('span', {})), el('p', { class: 'muted' }, 'Review the configuration from this link before adding it.'), ...(existing
        ? [el('p', { class: 'import-warn' }, `A scanner for this endpoint already exists ("${existing.name}").`)]
        : []), el('div', { class: 'config-card import-card' }, summary), el('div', { class: 'form-buttons import-buttons' }, ...buttons));
}
// -- Setup-code scan (scan a provisioning QR to add a config) ----------------
function renderSetup() {
    const videoWrap = el('div', { class: 'video-wrap' });
    const statusLine = el('div', { class: 'scan-status' }, 'Point at a setup QR code');
    let handled = false;
    const consume = (raw) => {
        if (handled)
            return;
        const payload = parseConfigLink(raw);
        if (payload) {
            handled = true;
            if (skipConfirmFromLink(raw)) {
                upsertConfig(payload);
                setView({ name: 'list' });
            }
            else {
                setView({ name: 'import', payload });
            }
        }
        else {
            statusLine.textContent = 'That’s not a setup code — try again';
            setTimeout(() => {
                if (!handled)
                    statusLine.textContent = 'Point at a setup QR code';
            }, 1600);
        }
    };
    const pasteLink = () => {
        const raw = prompt('Paste a setup link:');
        if (raw && raw.trim())
            consume(raw.trim());
    };
    const container = el('div', { class: 'scan-screen' }, el('header', { class: 'topbar scan-topbar' }, el('button', { class: 'btn ghost', onClick: () => setView({ name: 'list' }) }, '← Back'), el('h1', {}, 'Scan setup code'), el('span', {})), videoWrap, statusLine, el('div', { class: 'scan-actions' }, el('button', { class: 'btn ghost', onClick: pasteLink }, 'Paste setup link')));
    startCameraInto(videoWrap, {
        formats: ['qr'],
        debounceMs: 1500,
        onScan: (code) => consume(code),
        onError: (message) => {
            statusLine.textContent = message;
        },
    });
    return container;
}
// -- Quick scan (decode any code, no validation) -----------------------------
function renderQuick() {
    const videoWrap = el('div', { class: 'video-wrap' });
    const overlayHost = el('div', { class: 'overlay-host' });
    const statusLine = el('div', { class: 'scan-status' }, 'Point at any barcode or QR');
    let paused = false;
    const show = (code, type) => {
        paused = true;
        const copy = (e) => {
            const btn = e.currentTarget;
            void navigator.clipboard?.writeText(code);
            btn.textContent = 'Copied!';
            setTimeout(() => (btn.textContent = 'Copy'), 1400);
        };
        const card = el('div', { class: 'result-card', style: 'border-color:#334155' }, el('div', { class: 'result-banner', style: 'background:#334155' }, (type || 'code').toUpperCase()), el('div', { class: 'result-body' }, el('code', { class: 'result-code', style: 'font-size:15px' }, code), el('div', { class: 'result-fields' }, el('div', { class: 'result-field' }, el('span', { class: 'muted' }, 'Format'), el('span', {}, type || 'unknown')))), el('div', { class: 'form-buttons', style: 'padding:0 16px 16px' }, el('button', { class: 'btn ghost', onClick: copy }, 'Copy'), el('button', {
            class: 'btn primary',
            onClick: () => {
                overlayHost.replaceChildren();
                paused = false;
            },
        }, 'Scan again')));
        overlayHost.replaceChildren(el('div', { class: 'overlay-backdrop' }, card));
    };
    const container = el('div', { class: 'scan-screen' }, el('header', { class: 'topbar scan-topbar' }, el('button', { class: 'btn ghost', onClick: () => setView({ name: 'list' }) }, '← Back'), el('h1', {}, 'Quick scan'), el('span', {})), videoWrap, statusLine, overlayHost);
    startCameraInto(videoWrap, {
        formats: [...CODE_FORMATS],
        debounceMs: 1500,
        onScan: (code, type) => {
            if (!paused)
                show(code, type);
        },
        onError: (message) => {
            statusLine.textContent = message;
        },
    });
    return container;
}
// -- Render ------------------------------------------------------------------
function render() {
    const banner = isCameraView(view) ? null : renderBanner();
    let screen;
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
        case 'import':
            screen = renderImport(view.payload);
            break;
        case 'setup':
            screen = renderSetup();
            break;
        case 'quick':
            screen = renderQuick();
            break;
    }
    root.replaceChildren(...(banner ? [banner, screen] : [screen]));
}
// -- Boot --------------------------------------------------------------------
/**
 * Decide the initial view. A provisioning link (`?endpoint=...`) opens the
 * import-confirmation screen — the config is NOT added until the user confirms.
 */
function initialView() {
    if (!location.search)
        return { name: 'list' };
    const params = Object.fromEntries(new URLSearchParams(location.search).entries());
    const payload = payloadFromParams(params);
    // Clean the URL so a refresh doesn't re-open the prompt (pendingSearch keeps
    // the params for the banner's "Open in app" deeplink).
    history.replaceState(null, '', location.pathname);
    if (!payload)
        return { name: 'list' };
    // skipConfirm=true: add it straight away and go to the list.
    if (skipConfirmFromParams(params)) {
        upsertConfig(payload);
        return { name: 'list' };
    }
    return { name: 'import', payload };
}
getDeviceId(); // ensure a stable device id exists from first load
view = initialView();
render();
