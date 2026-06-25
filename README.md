# Open Ticket Scanner

An open-source QR / barcode **ticket scanner** built with Expo + React Native. Two modes:

- **Scan mode** — decode any QR or barcode and show its contents. No backend.
- **Ticket mode** — create named configurations (API URL, optional key, code formats). Each scan is POSTed to your server; the JSON response drives a **green / yellow / red** result popup with ticket details, a server message, and previous-scan info. Tap **Continue** for the next ticket, or enable **continuous mode** to scan hands-free. Scans are kept in a local history and double-scans are debounced.

## Tech

- **Expo SDK 56** (React Native 0.85), TypeScript, [expo-router](https://docs.expo.dev/router/introduction/)
- **[expo-camera](https://docs.expo.dev/versions/latest/sdk/camera/)** `CameraView` for barcode scanning (iOS + Android, MLKit on Android)
- **expo-sqlite** for scan history, **react-native-mmkv** for configs
- **zustand** for reactive config state

> **Why expo-camera, not react-native-vision-camera?** Vision Camera v5 (the version compatible with RN 0.85) only scans codes on iOS — its Android object output throws. expo-camera scans on both platforms using the same native engines (AVFoundation / MLKit). All camera code is isolated in [`src/camera/CameraScanner.tsx`](src/camera/CameraScanner.tsx) if you want to swap it.

## Getting started

This app uses native modules, so it runs in a **development build** (not Expo Go).

```bash
npm install

# Generate native projects
npx expo prebuild

# Run on a real device (recommended — simulators have no camera)
npm run ios       # or: npx expo run:ios --device
npm run android   # or: npx expo run:android
```

For distributable binaries, use [EAS Build](https://docs.expo.dev/build/introduction/) with the profiles in [`eas.json`](eas.json):

```bash
npx eas build --profile preview --platform android   # internal APK
npx eas build --profile production --platform all
```

### Testing the camera without a physical device

- **Android emulator:** open the emulator's **virtual scene** (extended controls) and use the built-in wall image, or point it at a QR shown on your screen.
- **iOS:** the simulator has no camera — use a real device.

## Ticket API contract

In ticket mode the app sends:

```http
POST <your API URL>
Content-Type: application/json
Authorization: Bearer <apiKey>   # if set (also sent as X-API-Key)

{ "code": "<scanned value>", "type": "qr", "configId": "...", "scannedAt": "<ISO>" }
```

The **default** response shape it understands:

```jsonc
{
  "status": "valid" | "used" | "invalid",   // or a boolean `valid`
  "message": "Valid – VIP entry",
  "ticket": { "name": "Ada Lovelace", "type": "VIP", "gate": "A" }
}
```

| status    | popup  |
| --------- | ------ |
| `valid`   | 🟢 green  |
| `used`    | 🟡 yellow |
| `invalid` | 🔴 red    |
| unknown / HTTP 5xx / network error | ⚫ error |

### Adapting to your server's format

Response handling is intentionally isolated to **one file**:
[`src/tickets/parseTicketResponse.ts`](src/tickets/parseTicketResponse.ts). Edit `STATUS_MAP`,
`pickStatus`, `pickMessage`, and `pickTicketFields` to match your JSON — nothing else changes.
Unit tests live in `parseTicketResponse.test.ts`:

```bash
npm test
```

### Try it with the mock server

A tiny zero-dependency mock server is included for local testing:

```bash
node scripts/mock-server.mjs        # listens on http://localhost:8787/validate
```

It returns `valid` / `used` / `invalid` based on the scanned code (see the file header).
Point a config's API URL at `http://<your-computer-ip>:8787/validate` (use your LAN IP, not
`localhost`, so the phone can reach it).

## Project structure

```
app/                       expo-router screens
  index.tsx                home (mode picker + config list)
  scan.tsx                 generic scan mode
  history.tsx              scan history
  tickets/
    configs/index.tsx      manage configurations
    configs/[id].tsx       create / edit configuration
    [configId]/scan.tsx    ticket scanning + result popups
src/
  camera/                  CameraScanner wrapper + scan debounce
  tickets/                 api client, response adapter, types
  storage/                 mmkv (configs) + sqlite (history)
  state/                   zustand config store
  ui/                      result popup, toast, history row, theme
```

## License

MIT — see [LICENSE](LICENSE).
