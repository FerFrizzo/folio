# Store screenshots

Drop final screenshots here, organised by store + device. Both stores
require a minimum of 2 screenshots per device class to publish; 5–8 is
the sweet spot for conversion.

## App Store Connect (iOS)

Apple requires screenshots for the **6.7" iPhone** display class. Older
sizes are auto-derived if the 6.7" set is supplied. iPad sizes are
optional but enable the iPad listing.

| Device class    | Resolution      | Notes                            |
| --------------- | --------------- | -------------------------------- |
| 6.7" iPhone     | 1290 × 2796 px  | Required                         |
| 6.5" iPhone     | 1242 × 2688 px  | Optional (Apple auto-derives)    |
| 12.9" iPad Pro  | 2048 × 2732 px  | Required if you ship the iPad listing |

## Google Play Console (Android)

Play requires phone + 7" tablet + 10" tablet, but only phone is mandatory
for an internal-track release.

| Device class | Resolution range            |
| ------------ | --------------------------- |
| Phone        | 1080–1920 px on the longer side, 16:9 ish |
| 7" tablet    | 1024–7680 px                |
| 10" tablet   | 1080–7680 px                |

## What to capture

For each platform, capture these flows in order — they tell the
"create → send → track" story reviewers grade highest:

1. **Dashboard** — Outstanding KPI in the hero size, Needs attention
   row visible, Recent activity row visible.
2. **Invoice editor — items section** — at least 3 line items showing
   per-line totals, the live grand total in the sticky footer.
3. **PDF preview on the detail screen** — the WebView showing the
   classic template with the navy accent.
4. **Send Email sheet** — pre-filled To / Subject / Body, an
   attachment row populated.
5. **Settings — Numbering + EmailDefaults cards** — proves the app is
   real software, not a thin wrapper.
6. *(Optional)* Credit note editor — shows the negative-total
   refund flow for the audit-trail story.

## Capturing on iOS Simulator

```sh
# 6.7" simulator (iPhone 16 Pro Max, iOS 17+).
xcrun simctl boot "iPhone 16 Pro Max"
open -a Simulator
# Take screenshots via the simulator menu (File → New Screen Shot).
```

## Capturing on Android emulator

```sh
emulator -avd Pixel_7_API_34
# Use the camera button in the emulator toolbar to save a PNG.
```

## Naming convention

```
ios-67-01-dashboard.png
ios-67-02-editor.png
…
android-phone-01-dashboard.png
android-phone-02-editor.png
…
```

Numeric prefix forces ordering in upload UIs.
