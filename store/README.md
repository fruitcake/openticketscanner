# Store assets

Marketing screenshots and graphics for the App Store and Google Play listings.
All assets are generated from code — edit `scripts/gen-screenshots.mjs` and run:

```bash
node scripts/gen-screenshots.mjs   # needs `rsvg-convert` (brew install librsvg)
```

Output lands in `store/screenshots/`.

## Files

| File | Size | Use |
| --- | --- | --- |
| `01-validate.png` | 1284×2778 | Green "valid" result popup |
| `02-duplicates.png` | 1284×2778 | Yellow "already used" / duplicate detection |
| `03-configure.png` | 1284×2778 | Connect to your own API |
| `04-provision.png` | 1284×2778 | Share a setup QR to provision devices |
| `05-history.png` | 1284×2778 | On-device scan history |
| `ipad-01-validate.png` | 2048×2732 | iPad — green "valid" result popup |
| `ipad-02-duplicates.png` | 2048×2732 | iPad — duplicate detection |
| `ipad-03-configure.png` | 2048×2732 | iPad — connect to your own API |
| `ipad-04-provision.png` | 2048×2732 | iPad — share a setup QR |
| `ipad-05-history.png` | 2048×2732 | iPad — on-device scan history |
| `play-feature-graphic.png` | 1024×500 | Google Play feature graphic (required) |

## Where they go

**App Store Connect — iPhone** — 6.7"/6.9" display (1284×2778). The five `01`–`05`
PNGs upload directly; the same images are accepted for the 6.5" slot.

**App Store Connect — iPad** — 12.9"/13" display (2048×2732). The five
`ipad-0x` PNGs go in the iPad slot. Unlike the iPhone shots (framed marketing
posters), these are full-bleed tablet UI: the portrait app centers its content
in a column with larger type, which is how it renders on iPad.

**Google Play** — "Phone screenshots" accepts the same 1284×2778 PNGs (Play
allows any 16:9-ish portrait between 320px and 3840px); the `ipad-0x` images
work for the "7-inch / 10-inch tablet" slots. `play-feature-graphic.png`
goes in the **Feature graphic** slot.

## Notes

- These are designed mockups, not live captures: the camera/scan screens render
  black on the iOS Simulator (no camera), so the hero "result popup" shots can't
  be captured there. The layouts, copy and colors mirror the real app
  (`src/ui/theme.ts`, the result overlay, config form, share and history screens).
- Two layout systems live in the generator: the iPhone shots (`poster()` +
  device frame, `shots` map) and the iPad shots (full-bleed `ipadSvg()`,
  `ipadShots` map). The `resultCard()` drawer is shared and geometry-driven (a
  `k` scale factor handles the larger iPad type).
- To add more device sizes, change `W`/`H` (iPhone) or `IW`/`IH` (iPad) and
  re-run. To reword the iPhone captions, edit the `shots` map.
