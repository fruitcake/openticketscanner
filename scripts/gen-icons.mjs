// Generates app icon, Android adaptive icon layers, splash logo, and favicon
// from SVG. Requires `rsvg-convert` (librsvg). Run: node scripts/gen-icons.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const BLUE1 = '#60a5fa';
const BLUE2 = '#2563eb';
const DARK = '#0b0f14';
const WHITE = '#ffffff';
const INK = '#0f172a';
const GREEN = '#22c55e';

const TMP = 'scripts/.icons-tmp';
mkdirSync(TMP, { recursive: true });

const defs = `
  <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${BLUE1}"/>
    <stop offset="1" stop-color="${BLUE2}"/>
  </linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="0.18"/>
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

// Scan reticle (4 rounded corner brackets) around a centered box of half-extent `b`.
function reticle(b, sw = 34, arm = 104, color = WHITE) {
  const cx = 512, cy = 512;
  const L = cx - b, R = cx + b, T = cy - b, B = cy + b;
  const k = (x, y, dx, dy) =>
    `<path d="M ${x} ${y + dy * arm} L ${x} ${y} L ${x + dx * arm} ${y}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return k(L, T, 1, 1) + k(R, T, -1, 1) + k(L, B, 1, -1) + k(R, B, -1, -1);
}

// The white QR card with a small "valid" check badge.
function card({ badge = true } = {}) {
  const w = 300, h = 300, x = 512 - w / 2, y = 512 - h / 2;
  const badgeSvg = badge
    ? `<g transform="translate(${x + w - 18} ${y + 18})">
         <circle r="54" fill="${GREEN}"/>
         <path d="M -26 2 L -8 22 L 28 -22" fill="none" stroke="${WHITE}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
       </g>`
    : '';
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="${WHITE}" filter="url(#soft)"/>
    ${qr(x + 46, y + 46, w - 92)}
    ${badgeSvg}`;
}

function svg(inner, { bg = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${defs}</defs>
  ${bg ? `<rect width="1024" height="1024" fill="url(#bg)"/>` : ''}
  ${inner}
</svg>`;
}

// Compose the mark (reticle + card), optionally scaled around center.
function mark(scale = 1, opts = {}) {
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    ${reticle(250)}
    ${card(opts)}
  </g>`;
}

// Monochrome silhouette (white reticle + white rounded card + check), for Android themed icons.
function monoMark(scale = 0.92) {
  const w = 300, h = 300, x = 512 - w / 2, y = 512 - h / 2;
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    ${reticle(250, 34, 104, WHITE)}
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="${WHITE}"/>
  </g>`;
}

const files = {
  'icon-full.svg': svg(mark(0.92), { bg: true }),
  'foreground.svg': svg(mark(0.82)),
  'background.svg': svg('', { bg: true }),
  'monochrome.svg': svg(monoMark(0.82)),
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
// Clean up the temporary SVG working dir.
rmSync(TMP, { recursive: true, force: true });
console.log('done');
