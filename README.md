# Folio

A single-user invoicing app for Australian small business. iOS + Android +
Web from one codebase, ATO-compliant Tax Invoices, GST + multi-currency,
discounts, credit notes, payment tracking, and SendGrid-backed email send.

**Status:** Phases 1–5 complete (foundation → core MVP → compliance & polish
→ send pipeline → pre-launch). Phase 6 (submit) is the next gate — see
[`docs/SUBMIT.md`](./docs/SUBMIT.md).

## Stack

- Expo SDK + TypeScript (strict), Expo Router, Expo Web
- NativeWind (Tailwind) with light + dark theme tokens
- Zustand + TanStack Query + React Hook Form + Zod
- Firebase (Firestore, Auth, Storage, Functions)
- Dinero.js for money math (integer cents, never floats)
- expo-print → SendGrid v3 Dynamic Templates for invoice email
- Cloud Functions in TypeScript, callable v2, region `australia-southeast1`

## Quick start

```sh
nvm use                           # Node 22 from .nvmrc
npm install
npm --prefix functions install    # Cloud Functions deps

# Fill in Firebase config and (optionally) provider IDs.
cp .env.example .env

# Generate icons (placeholder F mark on first run; swap source PNG later).
npm run icons

# Run on a platform.
npm start                         # Expo dev menu (i/a/w to pick platform)
```

For server-side setup (SendGrid, Apple/Google sign-in, store submission),
see the docs in [`docs/`](./docs/).

## Layout

```
app/                  Expo Router screens (file-based routing)
  (tabs)/             Dashboard / Invoices / Clients / Settings tabs
  invoices/           Editor + detail
  credit-notes/       Editor + detail
  onboarding/         4-step skippable flow
  _dev/               Component preview, dev only
src/
  components/ui/      Design system (~20 components)
  features/           Per-area UI + queries
    auth/             Anonymous + PIN + biometric + linkWithCredential
    invoices/         Editor, detail, sections, payment sheet
    credit-notes/
    settings/
    dashboard/
    onboarding/
  lib/                Pure logic + Firestore wrappers + PDF + exports + money
  types/schemas.ts    Zod source of truth for Firestore documents
functions/            Cloud Functions package (TypeScript)
  src/
    sendInvoiceEmail.ts
    exportPdfsZip.ts
    lib/
      template-snapshot/ (auto-synced from src/lib/pdf/)
docs/
  PROJECT_BRIEF.md    The kickoff specification
  SUBMIT.md           Phase 6 hand-off — what you do to ship
  RELEASING.md        Build + submit walkthrough
  SENDGRID.md         SendGrid account setup
  AUTH_PROVIDERS.md   Apple + Google OAuth setup
  legal/              Privacy + terms (deployed to GitHub Pages)
assets/
  source/             Drop a 1024x1024 brand mark here
  images/             Generated icons + splash
scripts/
  icons.mjs           Asset pipeline
  preflight.mjs       Run every quality gate before shipping
secrets/              Drop signing keys here (gitignored)
```

## Common scripts

| Command                      | Notes                                        |
| ---------------------------- | -------------------------------------------- |
| `npm start`                  | Expo dev menu                                |
| `npm run web`                | Expo web only                                |
| `npm run android` / `ios`    | Native dev build (needs prebuild)            |
| `npm run typecheck`          | Strict tsc                                   |
| `npm run lint`               | expo lint                                    |
| `npm test`                   | Jest — money / status / totals / pdf / abn / etc. |
| `npm run icons`              | Regenerate icon set from assets/source/icon.png |
| `npm run preflight`          | Run every quality gate (tsc + lint + jest + functions + doctor) |
| `npm run functions:build`    | Sync templates + tsc the functions package   |
| `npm run functions:test`     | Functions Jest                               |

## Privacy

Folio collects no telemetry, analytics, or crash reports. The user's data
lives in their own Firebase project. SendGrid is the only third-party
processor outside Firebase. See [`docs/legal/privacy.md`](./docs/legal/privacy.md).

## License

Personal project — not currently open-source-licensed. Contact the
repository owner before redistributing.
