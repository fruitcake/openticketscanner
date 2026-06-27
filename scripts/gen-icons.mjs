// Generates app icon, Android adaptive icon layers, splash logo, and favicon
// from SVG. Requires `rsvg-convert` (librsvg). Run: node scripts/gen-icons.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const DARK1 = '#0e2a1d'; // dark green — glow center
const DARK2 = '#05080a'; // near-black — edges
const WHITE = '#ffffff';
const INK = '#0f172a';
const GREEN = '#22c55e'; // valid-check green
const BRACKET = '#34d399'; // scan reticle — slightly lighter/teal so it reads apart from the check

const TMP = 'scripts/.icons-tmp';
mkdirSync(TMP, { recursive: true });

const defs = `
  <radialGradient id="bg" cx="512" cy="430" r="680" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${DARK1}"/>
    <stop offset="1" stop-color="${DARK2}"/>
  </radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="0.30"/>
  </filter>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
    <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="${GREEN}" flood-opacity="0.45"/>
  </filter>`;

// One finder-pattern square (the QR corner markers).
function finder(x, y, s) {
  const g = s / 7;
  return `
    <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${g * 0.9}" fill="${INK}"/>
    <rect x="${x + g}" y="${y + g}" width="${s - 2 * g}" height="${s - 2 * g}" rx="${g * 0.6}" fill="${WHITE}"/>
    <rect x="${x + 2 * g}" y="${y + 2 * g}" width="${s - 4 * g}" height="${s - 4 * g}" rx="${g * 0.4}" fill="${INK}"/>`;
}

// A mini QR-ish glyph filling a `size` box at (x,y).
function qr(x, y, size, color = INK) {
  const f = size * 0.32;
  let s = finder(x, y, f) + finder(x + size - f, y, f) + finder(x, y + size - f, f);
  // scattered modules for texture
  const m = size * 0.1;
  const cells = [
    [0.62, 0.62], [0.74, 0.62], [0.86, 0.62], [0.62, 0.74], [0.86, 0.74],
    [0.62, 0.86], [0.74, 0.86], [0.86, 0.86], [0.5, 0.74], [0.74, 0.5], [0.5, 0.5],
  ];
  for (const [cx, cy] of cells) {
    s += `<rect x="${x + cx * size}" y="${y + cy * size}" width="${m}" height="${m}" rx="${m * 0.25}" fill="${color}"/>`;
  }
  return s;
}

// Rounded-rectangle ticket outline with a semicircular notch punched out of the
// left and right edges at mid-height (the classic ticket-stub silhouette).
function ticketPath(x, y, w, h, r, nr) {
  const L = x, R = x + w, T = y, B = y + h, midY = y + h / 2;
  return `M ${L + r} ${T}
    L ${R - r} ${T}
    A ${r} ${r} 0 0 1 ${R} ${T + r}
    L ${R} ${midY - nr}
    A ${nr} ${nr} 0 0 0 ${R} ${midY + nr}
    L ${R} ${B - r}
    A ${r} ${r} 0 0 1 ${R - r} ${B}
    L ${L + r} ${B}
    A ${r} ${r} 0 0 1 ${L} ${B - r}
    L ${L} ${midY + nr}
    A ${nr} ${nr} 0 0 0 ${L} ${midY - nr}
    L ${L} ${T + r}
    A ${r} ${r} 0 0 1 ${L + r} ${T}
    Z`;
}

// Centered "valid" check disc, with a white halo ring that separates it from
// the QR modules behind it.
function checkBadge(cx = 512, cy = 512, r = 62) {
  const k = r * 0.42;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="${WHITE}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${GREEN}" filter="url(#glow)"/>
    <path d="M ${cx - k} ${cy + k * 0.1} L ${cx - k * 0.3} ${cy + k * 0.85} L ${cx + k} ${cy - k * 0.8}"
          fill="none" stroke="${WHITE}" stroke-width="${r * 0.28}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// Scan reticle (4 rounded corner brackets) around a centered box of half-extent `b`.
function reticle(b, sw = 34, arm = 104, color = BRACKET) {
  const cx = 512, cy = 512;
  const L = cx - b, R = cx + b, T = cy - b, B = cy + b;
  const k = (x, y, dx, dy) =>
    `<path d="M ${x} ${y + dy * arm} L ${x} ${y} L ${x + dx * arm} ${y}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return k(L, T, 1, 1) + k(R, T, -1, 1) + k(L, B, 1, -1) + k(R, B, -1, -1);
}

// The white ticket card: stub silhouette + QR fill + centered check.
function card({ check = true } = {}) {
  const w = 300, h = 360, x = 512 - w / 2, y = 512 - h / 2;
  const r = 40, nr = 30;
  const qrSize = w - 84; // inset from the ticket edges
  const qx = x + 42, qy = 512 - qrSize / 2;
  return `
    <path d="${ticketPath(x, y, w, h, r, nr)}" fill="${WHITE}" filter="url(#soft)"/>
    ${qr(qx, qy, qrSize)}
    ${check ? checkBadge() : ''}`;
}

function svg(inner, { bg = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${defs}</defs>
  ${bg ? `<rect width="1024" height="1024" fill="url(#bg)"/>` : ''}
  ${inner}
</svg>`;
}

// Compose the mark (reticle + ticket card), optionally scaled around center.
function mark(scale = 1, opts = {}) {
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    ${reticle(248)}
    ${card(opts)}
  </g>`;
}

// Monochrome silhouette (white reticle + white ticket), for Android themed icons.
function monoMark(scale = 0.86) {
  const w = 300, h = 360, x = 512 - w / 2, y = 512 - h / 2;
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    ${reticle(248, 34, 104, WHITE)}
    <path d="${ticketPath(x, y, w, h, 40, 30)}" fill="${WHITE}"/>
  </g>`;
}

const files = {
  'icon-full.svg': svg(mark(1.22), { bg: true }),
  'foreground.svg': svg(mark(1.06)),
  'background.svg': svg('', { bg: true }),
  'monochrome.svg': svg(monoMark(1.06)),
  'splash.svg': svg(mark(1.45)),
};

for (const [name, content] of Object.entries(files)) {
  writeFileSync(`${TMP}/${name}`, content);
}

function render(svgName, out, size) {
  execFileSync('rsvg-convert', [
    `${TMP}/${svgName}`, '-w', String(size), '-h', String(size), '-o', out,
  ]);
  console.log('wrote', out);
}

// Final assets
render('icon-full.svg', 'assets/icon.png', 1024);
render('foreground.svg', 'assets/android-icon-foreground.png', 1024);
render('background.svg', 'assets/android-icon-background.png', 1024);
render('monochrome.svg', 'assets/android-icon-monochrome.png', 1024);
render('splash.svg', 'assets/splash-icon.png', 1024);
render('icon-full.svg', 'assets/favicon.png', 64);
// Google Play "Hi-res icon" listing asset — must be exactly 512x512.
mkdirSync('store', { recursive: true });
render('icon-full.svg', 'store/play-hi-res-icon-512.png', 512);
// Clean up the temporary SVG working dir.
rmSync(TMP, { recursive: true, force: true });
console.log('done');
