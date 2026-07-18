/**
 * Camera scanning via the `barcode-detector` ponyfill (loaded as the global
 * `BarcodeDetectionAPI` from vendor/barcode-detector.js). Works cross-browser —
 * including iOS Safari and Firefox, which lack a native BarcodeDetector — by
 * decoding through zxing-wasm. The .wasm is served locally (no CDN).
 */
import type { CodeFormat } from '../tickets/types';

/** Our CodeFormat -> BarcodeDetector format string. */
const TO_DETECTOR: Record<CodeFormat, string> = {
  qr: 'qr_code',
  ean13: 'ean_13',
  ean8: 'ean_8',
  code128: 'code_128',
  code39: 'code_39',
  code93: 'code_93',
  codabar: 'codabar',
  itf14: 'itf',
  upc_a: 'upc_a',
  upc_e: 'upc_e',
  pdf417: 'pdf417',
  aztec: 'aztec',
  datamatrix: 'data_matrix',
};

/** Reverse map so a detected barcode reports our own format string as its type. */
const FROM_DETECTOR: Record<string, CodeFormat> = Object.fromEntries(
  Object.entries(TO_DETECTOR).map(([k, v]) => [v, k as CodeFormat]),
) as Record<string, CodeFormat>;

interface DetectedBarcode {
  rawValue: string;
  format: string;
}
interface DetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeAPI {
  BarcodeDetector: new (opts?: { formats?: string[] }) => DetectorLike;
  setZXingModuleOverrides?: (o: { locateFile: (path: string, prefix: string) => string }) => void;
}

declare global {
  interface Window {
    BarcodeDetectionAPI?: BarcodeAPI;
  }
}

/** Point zxing-wasm at our locally-hosted .wasm instead of its default CDN. */
let overridesSet = false;
function ensureOverrides(api: BarcodeAPI): void {
  if (overridesSet || !api.setZXingModuleOverrides) return;
  api.setZXingModuleOverrides({
    locateFile: (path, prefix) =>
      path.endsWith('.wasm') ? new URL('./vendor/zxing_reader.wasm', document.baseURI).href : prefix + path,
  });
  overridesSet = true;
}

export interface ScannerHandle {
  /** The live <video> element (already playing). */
  video: HTMLVideoElement;
  stop(): void;
}

export interface ScannerOptions {
  formats: CodeFormat[];
  /** Ignore a re-read of the same code within this many ms. */
  debounceMs: number;
  onScan(code: string, type: string): void;
  onError(message: string): void;
}

/**
 * Start the rear camera and begin detecting. Returns a handle whose `video`
 * should be inserted into the DOM. Call `stop()` to release the camera.
 */
export async function startScanner(opts: ScannerOptions): Promise<ScannerHandle> {
  const api = window.BarcodeDetectionAPI;
  if (!api) throw new Error('Scanner library failed to load.');
  ensureOverrides(api);

  const detectorFormats = opts.formats.map((f) => TO_DETECTOR[f]).filter(Boolean);
  const detector = new api.BarcodeDetector({ formats: detectorFormats });

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  });

  const video = document.createElement('video');
  video.setAttribute('playsinline', 'true'); // iOS: don't go fullscreen
  video.muted = true;
  video.srcObject = stream;
  await video.play();

  let stopped = false;
  let lastCode = '';
  let lastAt = 0;
  let inFlight = false;

  const tick = async (): Promise<void> => {
    if (stopped) return;
    if (!inFlight && video.readyState >= 2) {
      inFlight = true;
      try {
        const codes = await detector.detect(video);
        const hit = codes.find((c) => c.rawValue);
        if (hit) {
          const now = Date.now();
          const fresh = hit.rawValue !== lastCode || now - lastAt > opts.debounceMs;
          if (fresh) {
            lastCode = hit.rawValue;
            lastAt = now;
            opts.onScan(hit.rawValue, FROM_DETECTOR[hit.format] ?? hit.format);
          }
        }
      } catch {
        // Transient decode error on a frame — ignore and keep scanning.
      } finally {
        inFlight = false;
      }
    }
    if (!stopped) requestAnimationFrame(() => void tick());
  };
  void tick();

  return {
    video,
    stop() {
      stopped = true;
      for (const track of stream.getTracks()) track.stop();
      video.srcObject = null;
    },
  };
}
