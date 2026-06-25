# Open Ticket Scanner — agent notes

Expo SDK 56 (RN 0.85) + expo-router + TypeScript. Barcode scanning uses
**expo-camera** `CameraView` (NOT react-native-vision-camera — v5 can't scan on
Android). All camera code is isolated in `src/camera/CameraScanner.tsx`.

Key boundaries:
- `src/tickets/parseTicketResponse.ts` is the ONLY place coupled to the ticket
  server's JSON shape. Adapt it (and its test) to a new API; nothing else changes.
- `src/storage/` — MMKV (`createMMKV`, v4 is nitro-based) for configs, expo-sqlite
  for history. `react-native-mmkv` requires `react-native-nitro-modules`.

Checks:
- `npm test` — runs the adapter unit tests via `node --test` (pure, no RN imports).
- `npx tsc --noEmit` — typecheck.
- `npx expo export --platform ios|android` — full Metro bundle (catches resolution
  errors without needing a native build).

Native modules require a dev build (`npx expo prebuild` + `expo run:*`), not Expo Go.
Read versioned docs at https://docs.expo.dev/versions/v56.0.0/ before changing native config.
