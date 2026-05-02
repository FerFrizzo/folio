# Changelog

All notable changes to Folio. Versions track the value in `app.config.ts`.

## [Unreleased]

### Phase 6 (in progress) — Submit

- README, CHANGELOG, App Store + Play listing copy.
- `npm run preflight` runs every quality gate before a release cut.
- `docs/SUBMIT.md` enumerates the user-side steps to actually ship.

## [1.0.0] — 2026-05-02

### Phase 5 — Pre-launch

- **Apple + Google sign-in** wired via `linkWithCredential` so the
  existing anonymous UID + all data carries over.
- **Asset pipeline** (`scripts/icons.mjs`): single source PNG produces
  every icon variant + splash. Placeholder F-mark generator for first
  run.
- **Privacy + Terms** as Markdown in `docs/legal/`, deployed to GitHub
  Pages via Actions. Settings → About links to the hosted URLs.
- **`AboutCard`** in Settings: version, account state, sign-out flow,
  Privacy + Terms link-outs.
- **`app.config.ts`** finalised — `runtimeVersion`, iOS info-plist usage
  descriptions, Apple sign-in capability, Android USE_BIOMETRIC.
- **`eas.json`** submit profiles for App Store Connect + Play internal
  track. `secrets/` directory ready for signing keys.
- Docs: `RELEASING.md`, `AUTH_PROVIDERS.md`.

### Phase 4 — Send pipeline

- **`functions/`** TypeScript Cloud Functions package — Node 20, region
  `australia-southeast1`, drift-guarded PDF template snapshot.
- **`sendInvoiceEmail`** callable: Zod-validated payload, ownership
  check, transactional Draft → Sent + counter claim, PDF render via
  puppeteer-core + chromium, Storage caching by content hash, SendGrid
  Dynamic Template send with up to 5 attachments (10 MB combined cap).
- **`exportPdfsZip`** callable: server-side bundling for >50 docs.
- **`SendEmailSheet`** with `expo-document-picker` attachments.
- **`EmailDefaultsCard`** in Settings — subject/body templates with
  `{{var}}` substitution.
- Storage rules + `docs/SENDGRID.md`.

### Phase 3 — Compliance & polish

- **Discount math** — per-line then whole-invoice with proportional
  largest-remainder allocation; mixed-rate GST breakdown wording.
- **Multi-currency** — currency selector locked once lines exist;
  non-AUD invoices forced GST-free with export note on the PDF.
- **Payment tracking** — `recordPayment` / `removePayment` with
  transactional status flips; PaymentsLog UI; Mark paid + Record
  payment swipe actions and detail buttons re-enabled.
- **Credit notes** — separate counter (CN-####), atomic creation that
  links the invoice's `creditNoteIds`, dedicated PDF template; Net
  balance row on the invoice.
- **Custom numbering** — prefix + pad width + counter reset.
- **Line item library** with insert / save flow.
- **Archived view** — 7th chip on the list, Restore + permanent-delete.
- **Exports** — RFC-4180 CSV + PDF ZIP via jszip; account-link banner
  shell on dashboard.

### Phase 2 — Core MVP

- Real Firestore CRUD: profile, settings, clients, invoices, counters,
  with transactional invoice numbering.
- Settings screen: business profile, payment details, logo upload
  (≤500 px wide), theme override, security card.
- Clients: list with search, add, edit, soft-delete with has-invoices
  guardrail.
- Invoice editor: sticky header/footer, four collapsible cards,
  client picker sheet, repeatable line items, auto-save every 3 s.
- Save & Send: atomic counter claim → PDF generation → share sheet.
- Detail view with WebView/iframe PDF preview, Share, Duplicate, Archive.
- Dashboard: greeting, period selector (Month / Quarter / AU FY), three
  KPI cards, Needs attention, Recent activity.
- Onboarding 4-step skippable flow.
- Native auth persistence via AsyncStorage.

### Phase 1 — Foundation

- Expo SDK 54 + TypeScript strict + Expo Router + EAS config.
- NativeWind v4 with light + dark theme tokens (CSS vars).
- Firebase scaffold (Auth + Firestore + Storage) + deny-by-default
  Firestore rules.
- Anonymous auth + PIN/biometric gate (`expo-local-authentication`).
- ~20 design-system components (Button, Card, Input, Sheet, etc.).
- Mocked Invoices list as the cross-platform proof-of-concept.
- 9 conventional commits on top of the create-expo-app baseline.
