// Generates App Store / Play marketing screenshots as SVG -> PNG.
// Requires `rsvg-convert` (librsvg). Run: node scripts/gen-screenshots.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

// App palette (mirrors src/ui/theme.ts)
const C = {
  bg: '#0b0f14', surface: '#161b22', surfaceAlt: '#1f2630',
  text: '#e6edf3', muted: '#9aa7b4', border: '#2a323c',
  primary: '#3b82f6', green: '#1f9d55', yellow: '#d9a300', red: '#cc2936',
  blue1: '#60a5fa', blue2: '#1d4ed8', ink: '#0f172a', white: '#ffffff',
};

// Canvas = App Store 6.5"/6.7" portrait (1284 x 2778) — an Apple-accepted size
const W = 1284, H = 2778;
const PW = 980, PH = 2120, PX = (W - PW) / 2, PY = 560, BEZEL = 22, RAD = 110;
const SX = PX + BEZEL, SY = PY + BEZEL, SW = PW - 2 * BEZEL, SH = PH - 2 * BEZEL;
const SR = RAD - BEZEL;

const TMP = 'scripts/.ss-tmp';
mkdirSync(TMP, { recursive: true });
mkdirSync('store/screenshots', { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function text(x, y, s, { size = 36, color = C.text, weight = 400, anchor = 'start', mono = false } = {}) {
  const family = mono ? "'SF Mono', Menlo, monospace" : "-apple-system, 'Segoe UI', Roboto, sans-serif";
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
}

function rrect(x, y, w, h, r, fill, extra = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
}

// Rectangle with only the bottom two corners rounded.
function bottomRRect(x, y, w, h, r, fill) {
  return `<path d="M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} Z" fill="${fill}"/>`;
}

// scan reticle bracket set centered at (cx,cy), half-extent b
function reticle(cx, cy, b, sw, arm, color, opacity = 1) {
  const L = cx - b, R = cx + b, T = cy - b, B = cy + b;
  const k = (x, y, dx, dy) =>
    `<path d="M ${x} ${y + dy * arm} L ${x} ${y} L ${x + dx * arm} ${y}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<g opacity="${opacity}">${k(L, T, 1, 1) + k(R, T, -1, 1) + k(L, B, 1, -1) + k(R, B, -1, -1)}</g>`;
}

function header(title, { torch = false } = {}) {
  // baseline sits below the dynamic island (which ends ~SY+86)
  let s = text(SX + 60, SY + 158, '‹', { size: 70, color: C.white, weight: 300 });
  s += text(SX + 130, SY + 150, title, { size: 44, color: C.white, weight: 700 });
  if (torch) s += text(SX + SW - 110, SY + 160, '⚡', { size: 46 });
  return s;
}

function pill(cx, cy, label, { fill = C.surfaceAlt, color = C.text } = {}) {
  const w = label.length * 18 + 60, x = cx - w / 2;
  return rrect(x, cy - 38, w, 60, 30, fill) + text(cx, cy + 3, label, { size: 30, color, anchor: 'middle', weight: 600 });
}

// A result popup card (used for green + yellow/red states). Geometry-driven so
// the phone and iPad layouts share it: box = {cx, cy, cw, ch, k} (k scales type).
function resultCard(box, { status, banner, message, fields, note, button }) {
  const { cx, cy, cw, ch } = box, k = box.k || 1;
  const col = status === 'green' ? C.green : status === 'yellow' ? C.yellow : C.red;
  let s = rrect(cx, cy, cw, ch, 40 * k, '#11161c', `stroke="${col}" stroke-width="${4 * k}"`);
  const r = 40 * k;
  s += `<path d="M ${cx} ${cy + r} q 0 ${-r} ${r} ${-r} l ${cw - 2 * r} 0 q ${r} 0 ${r} ${r} l 0 ${105 * k} l ${-cw} 0 Z" fill="${col}"/>`;
  s += text(cx + cw / 2, cy + 118 * k, banner, { size: 60 * k, color: C.white, weight: 800, anchor: 'middle' });
  s += text(cx + cw / 2, cy + 238 * k, message, { size: 44 * k, color: C.text, weight: 600, anchor: 'middle' });
  let fy = cy + 330 * k;
  for (const [key, v] of fields) {
    s += text(cx + 55 * k, fy, key, { size: 36 * k, color: C.muted });
    s += text(cx + cw - 55 * k, fy, v, { size: 36 * k, color: C.text, weight: 600, anchor: 'end' });
    fy += 78 * k;
  }
  if (note) {
    const tint = note.tone === 'red' ? 'rgba(204,41,54,0.14)' : 'rgba(217,163,0,0.14)';
    const tcol = note.tone === 'red' ? C.red : C.yellow;
    s += rrect(cx + 45 * k, fy - 18 * k, cw - 90 * k, 118 * k, 16 * k, tint);
    s += text(cx + 75 * k, fy + 34 * k, note.label, { size: 26 * k, color: tcol, weight: 700 });
    s += text(cx + 75 * k, fy + 82 * k, note.detail, { size: 32 * k, color: C.text });
  }
  s += bottomRRect(cx, cy + ch - 112 * k, cw, 112 * k, 36 * k, button.color || col);
  s += text(cx + cw / 2, cy + ch - 40 * k, button.label, { size: 42 * k, color: C.white, weight: 700, anchor: 'middle' });
  return s;
}

function camBg() {
  return `<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="#05070a"/>
    <rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="url(#camv)"/>`;
}

// ---- Screen 1: green VALID ----
function s1() {
  return camBg() + header('Main gate', { torch: true }) +
    reticle(SX + SW / 2, SY + 470, 230, 16, 70, C.white, 0.45) +
    resultCard({ cx: SX + 75, cy: SY + 470, cw: SW - 150, ch: 1080 }, {
      status: 'green', banner: 'VALID', message: 'Welcome — VIP entry',
      fields: [['Name', 'Ada Lovelace'], ['Type', 'VIP'], ['Gate', 'A'], ['Seat', '12']],
      button: { label: 'Continue scanning' },
    });
}

// ---- Screen 2: yellow ALREADY USED ----
function s2() {
  return camBg() + header('Main gate', { torch: true }) +
    reticle(SX + SW / 2, SY + 470, 230, 16, 70, C.white, 0.45) +
    resultCard({ cx: SX + 75, cy: SY + 470, cw: SW - 150, ch: 1080 }, {
      status: 'yellow', banner: 'ALREADY USED', message: 'Ticket already scanned',
      fields: [['Name', 'Alan Turing'], ['Type', 'Standard'], ['Gate', 'A']],
      note: { tone: 'yellow', label: 'FIRST SCANNED', detail: 'Today at 19:42 · Gate A' },
      button: { label: 'Continue', color: C.surfaceAlt },
    });
}

// ---- Screen 3: configuration form ----
function s3() {
  let s = `<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="${C.bg}"/>`;
  s += header('New configuration');
  const fx = SX + 60, fw = SW - 120;
  let y = SY + 220;
  const field = (label, value, { mono = false } = {}) => {
    let o = text(fx, y, label, { size: 32, color: C.muted, weight: 600 });
    y += 28;
    o += rrect(fx, y, fw, 96, 20, C.surface, `stroke="${C.border}" stroke-width="2"`);
    o += text(fx + 34, y + 60, value, { size: 36, color: C.text, mono });
    y += 148;
    return o;
  };
  s += field('Name', 'Main gate');
  s += field('API URL', 'https://api.myevent.com/validate', { mono: true });
  s += field('API key', '••••••••••••3f9a', { mono: true });
  s += field('Scanner name', 'Entrance #1');
  // code formats label + chips
  s += text(fx, y, 'Code formats', { size: 32, color: C.muted, weight: 600 });
  y += 70;
  const chips = [['QR', true], ['Code 128', true], ['EAN-13', false], ['PDF417', false]];
  let cxp = fx;
  for (const [lbl, on] of chips) {
    const w = lbl.length * 19 + 64;
    s += rrect(cxp, y - 44, w, 64, 32, on ? C.primary : C.surfaceAlt);
    s += text(cxp + w / 2, y - 2, lbl, { size: 30, color: on ? C.white : C.muted, anchor: 'middle', weight: 600 });
    cxp += w + 22;
  }
  y += 96;
  // continuous switch row
  s += rrect(fx, y, fw, 100, 20, C.surface, `stroke="${C.border}" stroke-width="2"`);
  s += text(fx + 34, y + 62, 'Continuous scanning', { size: 36, color: C.text });
  s += rrect(fx + fw - 110, y + 26, 76, 48, 24, C.green);
  s += `<circle cx="${fx + fw - 48}" cy="${y + 50}" r="20" fill="${C.white}"/>`;
  y += 150;
  // save button
  s += rrect(fx, y, fw, 112, 24, C.primary);
  s += text(fx + fw / 2, y + 72, 'Save configuration', { size: 42, color: C.white, weight: 700, anchor: 'middle' });
  return s;
}

// ---- a QR glyph (white card + black modules), deterministic ----
function qrGlyph(x, y, size) {
  const n = 21, m = size / n;
  const finder = (gx, gy) => {
    const u = m;
    return rrect(x + gx * m, y + gy * m, 7 * u, 7 * u, u, C.ink) +
      rrect(x + (gx + 1) * m, y + (gy + 1) * m, 5 * u, 5 * u, u * 0.8, C.white) +
      rrect(x + (gx + 2) * m, y + (gy + 2) * m, 3 * u, 3 * u, u * 0.5, C.ink);
  };
  let s = rrect(x - m, y - m, size + 2 * m, size + 2 * m, m * 1.5, C.white);
  s += finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7);
  const inFinder = (i, j) => (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (inFinder(i, j)) continue;
      if (((i * 7 + j * 13 + i * j) % 5) < 2) {
        s += `<rect x="${x + i * m}" y="${y + j * m}" width="${m}" height="${m}" fill="${C.ink}"/>`;
      }
    }
  }
  return s;
}

// ---- Screen 4: share / provision ----
function s4() {
  let s = `<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="${C.bg}"/>`;
  s += header('Share setup');
  s += text(SX + SW / 2, SY + 230, 'Scan to provision a device', { size: 40, color: C.text, weight: 600, anchor: 'middle' });
  const qs = 560, qx = SX + (SW - qs) / 2, qy = SY + 300;
  s += rrect(qx - 50, qy - 50, qs + 100, qs + 100, 40, C.white);
  s += qrGlyph(qx, qy, qs);
  let y = qy + qs + 150;
  // link chip
  s += rrect(SX + 60, y, SW - 120, 90, 18, C.surface, `stroke="${C.border}" stroke-width="2"`);
  s += text(SX + 90, y + 58, 'app.openticketscanner.com/configure…', { size: 30, color: C.muted, mono: true });
  y += 150;
  // include key switch
  s += rrect(SX + 60, y, SW - 120, 100, 20, C.surface, `stroke="${C.border}" stroke-width="2"`);
  s += text(SX + 94, y + 62, 'Include API key', { size: 36, color: C.text });
  s += rrect(SX + SW - 170, y + 26, 76, 48, 24, C.green);
  s += `<circle cx="${SX + SW - 108}" cy="${y + 50}" r="20" fill="${C.white}"/>`;
  y += 150;
  // buttons row
  const bw = (SW - 120 - 30) / 2;
  s += rrect(SX + 60, y, bw, 110, 22, C.primary);
  s += text(SX + 60 + bw / 2, y + 70, 'Share', { size: 40, color: C.white, weight: 700, anchor: 'middle' });
  s += rrect(SX + 90 + bw, y, bw, 110, 22, C.surfaceAlt);
  s += text(SX + 90 + bw + bw / 2, y + 70, 'Copy link', { size: 40, color: C.text, weight: 700, anchor: 'middle' });
  return s;
}

// ---- Screen 5: history ----
function s5() {
  let s = `<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="${C.bg}"/>`;
  s += header('History');
  const rows = [
    ['green', 'TKT-4F9A21', 'Ada Lovelace', '20:14:58', 'Valid'],
    ['green', 'TKT-77C0E2', 'Grace Hopper', '20:14:31', 'Valid'],
    ['yellow', 'TKT-4F9A21', 'Alan Turing', '20:13:09', 'Already used'],
    ['red', 'TKT-0000XX', '—', '20:11:47', 'Invalid'],
    ['green', 'TKT-91BB0C', 'Katherine J.', '20:10:22', 'Valid'],
    ['green', 'TKT-23A7F1', 'Edsger D.', '20:09:50', 'Valid'],
    ['yellow', 'TKT-23A7F1', 'Edsger D.', '20:09:12', 'Already used'],
    ['green', 'TKT-5C18AA', 'Barbara L.', '20:08:33', 'Valid'],
  ];
  let y = SY + 200;
  for (const [st, code, name, time, label] of rows) {
    const col = st === 'green' ? C.green : st === 'yellow' ? C.yellow : C.red;
    s += rrect(SX + 50, y, SW - 100, 150, 22, C.surface, `stroke="${C.border}" stroke-width="2"`);
    s += `<circle cx="${SX + 100}" cy="${y + 75}" r="16" fill="${col}"/>`;
    s += text(SX + 144, y + 60, code, { size: 36, color: C.text, weight: 700, mono: true });
    s += text(SX + 144, y + 110, name, { size: 30, color: C.muted });
    s += text(SX + SW - 80, y + 60, label, { size: 32, color: col, weight: 700, anchor: 'end' });
    s += text(SX + SW - 80, y + 110, time, { size: 28, color: C.muted, anchor: 'end' });
    y += 172;
  }
  return s;
}

function frame(inner) {
  return `
    <clipPath id="screen"><rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" rx="${SR}"/></clipPath>
    ${rrect(PX, PY, PW, PH, RAD, '#0a0a0c', `stroke="#23262b" stroke-width="6"`)}
    <g clip-path="url(#screen)">${inner}</g>
    <rect x="${SX + SW / 2 - 110}" y="${SY + 28}" width="220" height="58" rx="29" fill="#000"/>`;
}

function poster({ title, subtitle, screen }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="poster" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${C.blue2}"/>
        <stop offset="0.55" stop-color="#0b1a3a"/>
        <stop offset="1" stop-color="${C.bg}"/>
      </linearGradient>
      <linearGradient id="camv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b1118"/><stop offset="1" stop-color="#05070a"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#poster)"/>
    ${text(W / 2, 250, title, { size: 86, color: C.white, weight: 800, anchor: 'middle' })}
    ${text(W / 2, 358, subtitle, { size: 46, color: '#c7d2fe', weight: 500, anchor: 'middle' })}
    ${frame(screen)}
  </svg>`;
}

// ===================== iPad (2048 x 2732, full-bleed tablet UI) =====================
// On iPad the portrait app centers its content in a column on the dark background
// and uses larger type — these layouts mirror that and fill the 3:4 canvas.
const IW = 2048, IH = 2732, IPAD = 180;

function ipHeader(title, { torch = false, onCam = false } = {}) {
  const col = onCam ? C.white : C.text;
  let s = text(IPAD, 224, '‹', { size: 84, color: col, weight: 300 });
  s += text(IPAD + 84, 214, title, { size: 56, color: col, weight: 700 });
  if (torch) s += text(IW - IPAD, 226, '⚡', { size: 58, anchor: 'end' });
  return s;
}
const ipCamBg = () => `<rect width="${IW}" height="${IH}" fill="#05070a"/><rect width="${IW}" height="${IH}" fill="url(#camv)"/>`;
const ipAppBg = () => `<rect width="${IW}" height="${IH}" fill="${C.bg}"/>`;

function ip1() {
  const cw = 1200, cx = (IW - cw) / 2, ch = 1500, cy = 660, k = 1.45;
  return ipCamBg() + ipHeader('Main gate', { torch: true, onCam: true }) +
    reticle(IW / 2, 600, 300, 22, 110, C.white, 0.4) +
    resultCard({ cx, cy, cw, ch, k }, {
      status: 'green', banner: 'VALID', message: 'Welcome — VIP entry',
      fields: [['Name', 'Ada Lovelace'], ['Type', 'VIP'], ['Gate', 'A'], ['Seat', '12']],
      button: { label: 'Continue scanning' },
    });
}
function ip2() {
  const cw = 1200, cx = (IW - cw) / 2, ch = 1500, cy = 660, k = 1.45;
  return ipCamBg() + ipHeader('Main gate', { torch: true, onCam: true }) +
    reticle(IW / 2, 600, 300, 22, 110, C.white, 0.4) +
    resultCard({ cx, cy, cw, ch, k }, {
      status: 'yellow', banner: 'ALREADY USED', message: 'Ticket already scanned',
      fields: [['Name', 'Alan Turing'], ['Type', 'Standard'], ['Gate', 'A']],
      note: { tone: 'yellow', label: 'FIRST SCANNED', detail: 'Today at 19:42 · Gate A' },
      button: { label: 'Continue', color: C.surfaceAlt },
    });
}
function ip3() {
  let s = ipAppBg() + ipHeader('New configuration');
  const colW = 1340, fx = (IW - colW) / 2, fw = colW;
  let y = 480;
  const field = (label, value, { mono = false } = {}) => {
    let o = text(fx, y, label, { size: 40, color: C.muted, weight: 600 });
    y += 34;
    o += rrect(fx, y, fw, 128, 24, C.surface, `stroke="${C.border}" stroke-width="2"`);
    o += text(fx + 40, y + 82, value, { size: 46, color: C.text, mono });
    y += 204;
    return o;
  };
  s += field('Name', 'Main gate');
  s += field('API URL', 'https://api.myevent.com/validate', { mono: true });
  s += field('API key', '••••••••••••3f9a', { mono: true });
  s += field('Scanner name', 'Entrance #1');
  s += text(fx, y, 'Code formats', { size: 40, color: C.muted, weight: 600 });
  y += 96;
  let cxp = fx;
  for (const [lbl, on] of [['QR', true], ['Code 128', true], ['EAN-13', false], ['PDF417', false]]) {
    const w = lbl.length * 24 + 84;
    s += rrect(cxp, y - 58, w, 84, 42, on ? C.primary : C.surfaceAlt);
    s += text(cxp + w / 2, y - 4, lbl, { size: 38, color: on ? C.white : C.muted, anchor: 'middle', weight: 600 });
    cxp += w + 28;
  }
  y += 140;
  s += rrect(fx, y, fw, 134, 24, C.surface, `stroke="${C.border}" stroke-width="2"`);
  s += text(fx + 40, y + 86, 'Continuous scanning', { size: 46, color: C.text });
  s += rrect(fx + fw - 152, y + 35, 102, 64, 32, C.green);
  s += `<circle cx="${fx + fw - 67}" cy="${y + 67}" r="26" fill="${C.white}"/>`;
  y += 214;
  s += rrect(fx, y, fw, 150, 30, C.primary);
  s += text(fx + fw / 2, y + 98, 'Save configuration', { size: 52, color: C.white, weight: 700, anchor: 'middle' });
  return s;
}
function ip4() {
  let s = ipAppBg() + ipHeader('Share setup');
  s += text(IW / 2, 372, 'Scan to provision a device', { size: 50, color: C.text, weight: 600, anchor: 'middle' });
  const qs = 840, qx = (IW - qs) / 2, qy = 480;
  s += rrect(qx - 72, qy - 72, qs + 144, qs + 144, 56, C.white);
  s += qrGlyph(qx, qy, qs);
  const colW = 1340, fx = (IW - colW) / 2;
  let y = qy + qs + 230;
  s += rrect(fx, y, colW, 122, 24, C.surface, `stroke="${C.border}" stroke-width="2"`);
  s += text(fx + 44, y + 80, 'app.openticketscanner.com/configure…', { size: 40, color: C.muted, mono: true });
  y += 196;
  s += rrect(fx, y, colW, 134, 24, C.surface, `stroke="${C.border}" stroke-width="2"`);
  s += text(fx + 44, y + 86, 'Include API key', { size: 46, color: C.text });
  s += rrect(fx + colW - 152, y + 35, 102, 64, 32, C.green);
  s += `<circle cx="${fx + colW - 67}" cy="${y + 67}" r="26" fill="${C.white}"/>`;
  y += 214;
  const bw = (colW - 40) / 2;
  s += rrect(fx, y, bw, 150, 30, C.primary);
  s += text(fx + bw / 2, y + 98, 'Share', { size: 52, color: C.white, weight: 700, anchor: 'middle' });
  s += rrect(fx + bw + 40, y, bw, 150, 30, C.surfaceAlt);
  s += text(fx + bw + 40 + bw / 2, y + 98, 'Copy link', { size: 52, color: C.text, weight: 700, anchor: 'middle' });
  return s;
}
function ip5() {
  let s = ipAppBg() + ipHeader('History');
  const rows = [
    ['green', 'TKT-4F9A21', 'Ada Lovelace', '20:14:58', 'Valid'],
    ['green', 'TKT-77C0E2', 'Grace Hopper', '20:14:31', 'Valid'],
    ['yellow', 'TKT-4F9A21', 'Alan Turing', '20:13:09', 'Already used'],
    ['red', 'TKT-0000XX', '—', '20:11:47', 'Invalid'],
    ['green', 'TKT-91BB0C', 'Katherine J.', '20:10:22', 'Valid'],
    ['green', 'TKT-23A7F1', 'Edsger D.', '20:09:50', 'Valid'],
    ['yellow', 'TKT-23A7F1', 'Edsger D.', '20:09:12', 'Already used'],
    ['green', 'TKT-5C18AA', 'Barbara L.', '20:08:33', 'Valid'],
    ['green', 'TKT-3E0D9B', 'Margaret H.', '20:07:55', 'Valid'],
    ['green', 'TKT-6A2F40', 'John von N.', '20:07:18', 'Valid'],
    ['green', 'TKT-12C8E7', 'Dennis R.', '20:06:44', 'Valid'],
  ];
  const x = IPAD, w = IW - 2 * IPAD;
  let y = 360;
  for (const [st, code, name, time, label] of rows) {
    const col = st === 'green' ? C.green : st === 'yellow' ? C.yellow : C.red;
    s += rrect(x, y, w, 172, 26, C.surface, `stroke="${C.border}" stroke-width="2"`);
    s += `<circle cx="${x + 66}" cy="${y + 86}" r="22" fill="${col}"/>`;
    s += text(x + 130, y + 72, code, { size: 44, color: C.text, weight: 700, mono: true });
    s += text(x + 130, y + 128, name, { size: 36, color: C.muted });
    s += text(x + w - 50, y + 72, label, { size: 40, color: col, weight: 700, anchor: 'end' });
    s += text(x + w - 50, y + 128, time, { size: 34, color: C.muted, anchor: 'end' });
    y += 200;
  }
  return s;
}

function ipadSvg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${IW}" height="${IH}" viewBox="0 0 ${IW} ${IH}">
    <defs>
      <linearGradient id="camv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b1118"/><stop offset="1" stop-color="#05070a"/>
      </linearGradient>
    </defs>
    ${inner}
  </svg>`;
}

const ipadShots = {
  'ipad-01-validate': ipadSvg(ip1()),
  'ipad-02-duplicates': ipadSvg(ip2()),
  'ipad-03-configure': ipadSvg(ip3()),
  'ipad-04-provision': ipadSvg(ip4()),
  'ipad-05-history': ipadSvg(ip5()),
};

const shots = {
  '01-validate': poster({ title: 'Validate in a tap', subtitle: 'Green, yellow or red — instantly', screen: s1() }),
  '02-duplicates': poster({ title: 'Catch every duplicate', subtitle: 'See when a ticket was first used', screen: s2() }),
  '03-configure': poster({ title: 'Connect any backend', subtitle: 'Your API, your rules', screen: s3() }),
  '04-provision': poster({ title: 'Provision in one scan', subtitle: 'Share a setup QR with every device', screen: s4() }),
  '05-history': poster({ title: 'Every scan, logged', subtitle: 'On-device history you can trust', screen: s5() }),
};

// ---- Google Play feature graphic (1024 x 500) ----
function featureGraphic() {
  const w = 1024, h = 500;
  // small brand mark: white QR card + green check, on the gradient
  const mx = 120, my = 250, ms = 150;
  const mark = `
    <rect x="${mx - ms / 2}" y="${my - ms / 2}" width="${ms}" height="${ms}" rx="28" fill="${C.white}"/>
    ${qrGlyph(mx - ms / 2 + 26, my - ms / 2 + 26, ms - 52)}
    <g transform="translate(${mx + ms / 2 - 8} ${my - ms / 2 + 8})">
      <circle r="34" fill="${C.green}"/>
      <path d="M -16 1 L -5 13 L 17 -14" fill="none" stroke="${C.white}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="fg" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${C.blue1}"/><stop offset="1" stop-color="${C.blue2}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#fg)"/>
    ${mark}
    ${text(250, 232, 'Open Ticket Scanner', { size: 76, color: C.white, weight: 800 })}
    ${text(252, 300, 'Scan & validate tickets against your own API', { size: 38, color: '#e6efff', weight: 500 })}
  </svg>`;
}
writeFileSync(`${TMP}/feature.svg`, featureGraphic());
execFileSync('rsvg-convert', [`${TMP}/feature.svg`, '-w', '1024', '-h', '500', '-o', 'store/screenshots/play-feature-graphic.png']);

for (const [name, svg] of Object.entries(shots)) {
  writeFileSync(`${TMP}/${name}.svg`, svg);
  const out = `store/screenshots/${name}.png`;
  execFileSync('rsvg-convert', [`${TMP}/${name}.svg`, '-w', String(W), '-h', String(H), '-o', out]);
  // contact-sheet preview (small)
  execFileSync('rsvg-convert', [`${TMP}/${name}.svg`, '-w', '300', '-h', '650', '-o', `${TMP}/${name}.prev.png`]);
  console.log('wrote', out);
}

for (const [name, svg] of Object.entries(ipadShots)) {
  writeFileSync(`${TMP}/${name}.svg`, svg);
  const out = `store/screenshots/${name}.png`;
  execFileSync('rsvg-convert', [`${TMP}/${name}.svg`, '-w', String(IW), '-h', String(IH), '-o', out]);
  execFileSync('rsvg-convert', [`${TMP}/${name}.svg`, '-w', '360', '-h', '480', '-o', `${TMP}/${name}.prev.png`]);
  console.log('wrote', out);
}
console.log('done — store/screenshots/*.png');
