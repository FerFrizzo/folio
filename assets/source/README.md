# Source assets

`icon.png` is the single source of truth for every app icon + splash variant.
Drop a 1024×1024 PNG here, then run from the repo root:

```sh
npm run icons
```

The pipeline produces:

- `assets/images/icon.png` — 1024×1024, iOS + generic
- `assets/images/adaptive-icon.png` — Android adaptive (legacy single-layer)
- `assets/images/android-icon-foreground.png` — Android adaptive foreground
- `assets/images/android-icon-background.png` — Android adaptive background
- `assets/images/android-icon-monochrome.png` — Android adaptive monochrome
- `assets/images/favicon.png` — web favicon
- `assets/images/splash-icon.png` — splash screen mark

If `icon.png` is missing, the script generates a placeholder (navy "F"
on the brand accent) so the build still produces a valid set. Replace
the source whenever you have a final brand mark.

Source dimensions and design tips:
- 1024×1024 PNG with transparent or solid background (the script masks
  to a square; any padding is preserved).
- Keep important content within the central ~85% of the canvas — the
  Android adaptive icon system trims the outer edges.
- Avoid drop shadows or text smaller than ~10% of the canvas height —
  small detail disappears at favicon size.
