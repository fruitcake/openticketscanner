# Open Ticket Scanner — agent notes

Expo SDK 56 (RN 0.85) + expo-router + TypeScript. Barcode scanning uses
**expo-camera** `CameraView` (NOT react-native-vision-camera — v5 can't scan on
Android). All camera code is isolated in `src/camera/CameraScanner.tsx`.

Key boundaries:
- `src/tickets/parseTicketResponse.ts` is the ONLY place coupled to the ticket
  server's JSON shape. Adapt it (and its test) to a new API; nothing else changes.
- `src/storage/` — MMKV (`createMMKV`, v4 is nitro-based) for configs, expo-sqlite
  for history. `react-native-mmkv` requires `react-native-nitro-modules`.

Static web build (`web/scan/`):
- A dependency-free browser port of the scanner, served statically alongside the
  landing pages. Source in `src/web/`; `npm run build:web` (`tsc -p
  tsconfig.web.json`) compiles it + the RN-free shared modules
  (`parseTicketResponse`, `configLink`, `format`, `types`) to ESM under
  `web/scan/app/` — so `parseTicketResponse` stays the single source of truth for
  BOTH targets. The compiled output is committed so the site deploys as-is; rerun
  `build:web` after touching `src/web/` or those shared modules.
- Scanning uses the vendored `barcode-detector` ponyfill + local `zxing_reader.wasm`
  in `web/scan/vendor/` (cross-browser incl. iOS Safari; no CDN). Storage is
  `localStorage` (`src/web/storage.ts`); the request layer is `src/web/api.ts` (a
  browser twin of `src/tickets/api.ts` — it omits custom request headers on keyless
  requests so GET-mode hits a static JSON host without a CORS preflight).
- Imports the same `?endpoint=...` provisioning payload as the native deeplink, so
  a configure link works in-browser too; `web/configure/` offers a "use in browser"
  fallback.

Checks:
- `npm test` — runs the adapter unit tests via `node --test` (pure, no RN imports).
- `npx tsc --noEmit` — typecheck (RN app; excludes `src/web`).
- `npm run build:web` — typechecks + emits the static web scanner.
- `npx expo export --platform ios|android` — full Metro bundle (catches resolution
  errors without needing a native build).

Native modules require a dev build (`npx expo prebuild` + `expo run:*`), not Expo Go.
Read versioned docs at https://docs.expo.dev/versions/v56.0.0/ before changing native config.
