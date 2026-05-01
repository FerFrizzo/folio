# Folio — Australian Invoicing App: Initial Build Prompt

You are helping me build Folio, an Australian invoicing app. This is the kickoff prompt with the complete specification. Read it fully before writing any code. Ask me to confirm the bundle ID and domain before the first EAS Build — everything else is decided.

## 1. What we're building

A single-user, solo-business invoicing app for Australian small business. Cross-platform iOS + Android + Web from one codebase. Cloud-synced data, biometric/PIN gate, ATO-compliant Tax Invoices with multi-currency, multi-GST-rate, discounts, credit notes, payment tracking, and email send via SendGrid. Eventual public release on App Store + Play Store. No telemetry, no analytics, no crash reporting.

## 2. Tech stack (locked)

- **Framework:** Expo SDK (managed workflow) + TypeScript, Expo Router, Expo Web. EAS Build + EAS Submit for store pipelines.
- **UI:** NativeWind (Tailwind for React Native). Configure with both iOS/Android and web targets.
- **State:** Zustand (app state) + TanStack Query (server state) + React Hook Form + Zod (forms/validation).
- **Backend:** Firebase — Firestore (data), Auth (anonymous + optional Apple/Google linking), Storage (logos, cached PDFs), Cloud Functions (email send, large ZIP exports). Do not use Supabase.
- **Money math:** Dinero.js. Store all amounts as integer cents in the invoice's currency. Format only at render. Never use floats for money.
- **PDF:** expo-print (HTML → PDF, works on iOS, Android, and web).
- **Email:** SendGrid v3 Mail Send API, called from a Cloud Function so the API key never ships client-side. Use Dynamic Templates for the email body, attach the PDF via the attachments array (base64-encoded), use personalizations for any to/cc fields.
- **Other:** expo-sharing, expo-local-authentication, expo-image-picker, expo-image-manipulator (resize logo to ≤500px wide on upload), date-fns.

Explicitly excluded from v1: Sentry, PostHog, Firebase Analytics, Expo Notifications, i18n libraries, deposits/progress invoicing, recurring invoices, quotes, attachments embedded in PDF.

## 3. Project foundations (decided)

- **Audience:** single user, single business, GST-registered. Document title is always "Tax Invoice".
- **Distribution:** App Store + Play Store eventually. Build with that in mind from day one (proper bundle ID, asset pipeline, store-ready privacy disclosures).
- **Platforms:** iOS, Android, Web (Expo Web).
- **Telemetry:** none. Privacy policy will honestly say "we collect no usage data."
- **Process:** Figma wireframes first (to be done later by me), then code. For now, scaffold the project + design system + a single proof-of-concept screen so I can validate the cross-platform feel before building everything out.
- **Timeline:** no deadline, build it right.

## 4. Data model (Firestore)

```
users/{uid}
  profile     { businessName, abn, address, email, phone, logoUrl,
                gstRegistered: true }
  settings    { numbering: { mode: 'auto'|'custom', prefix, counter, customFormat },
                lineItemMode: 'basic' | 'units',
                defaultGstRate: 0.10,
                defaultPaymentTermsDays: 14,
                defaultCurrency: 'AUD',
                paymentDetails: { bsb, accName, accNumber, payId, otherNotes },
                pinHash, biometricEnabled,
                themeMode: 'system' | 'light' | 'dark' }

users/{uid}/clients/{clientId}
  { name, email, address, abn?, notes, createdAt, deletedAt? }

users/{uid}/lineItemLibrary/{itemId}
  { description, defaultQty, unit?, unitPrice, gstRate, createdAt }

users/{uid}/invoices/{invoiceId}
  { number, status, industry,
    currency, exchangeRateNote?,
    clientId, clientSnapshot,
    issueDate, dueDate,
    lineItems: [{ description, qty|units, unit?, unitPrice,
                  lineDiscount: { type: 'pct'|'fixed', value },
                  gstRate, gstAmount, lineTotal }],
    invoiceDiscount: { type: 'pct'|'fixed', value }?,
    subtotal, discountTotal, gstTotal, total,
    payments: [{ date, amount, method, note }],
    amountPaid, balance,
    notes, paymentInstructionsSnapshot,
    pdfUrl?, sentAt?, paidAt?,
    creditNoteIds: [],
    createdAt, updatedAt, deletedAt? }

users/{uid}/creditNotes/{cnId}
  { number, originalInvoiceId, lineItems, currency,
    subtotal, gstTotal, total, reason,
    issueDate, pdfUrl?, deletedAt?, createdAt, updatedAt }

users/{uid}/counters/{counterDoc}
  { invoiceCounter, creditNoteCounter, year? }
```

Rules:

- Counters are updated via Firestore transactions to prevent number-sequencing races.
- `clientSnapshot` and `paymentInstructionsSnapshot` are written at invoice creation/edit time and never auto-updated. Editing the business profile or a client must NOT alter historical invoices.
- Sent/Paid/Partial/Overdue invoices are immutable except for payments, status, and credit-note linkage.

## 5. Tax, currency, and money rules

- Default GST 10%, per-line override (set rate to 0 for GST-free items).
- Multi-currency per invoice. AUD default. GST applies only to AUD invoices in v1; non-AUD invoices are treated as exports (GST-free) with a note on the PDF.
- Rounding: per-line rounding to the nearest cent, then sum. Matches Xero/MYOB and is ATO-accepted.
- PDF totals: if all lines share one GST rate, single GST line. If mixed (e.g., 10% lines + GST-free lines), show subtotal (ex GST) + a breakdown line "Includes $X GST on $Y of taxable items" + total.
- Discounts: both supported.
  - Per-line discount (pct or fixed) reduces the line total before GST is calculated for that line.
  - Whole-invoice discount (pct or fixed) applied to subtotal proportionally across taxable lines so GST stays correct. Show this explicitly on the PDF — never hide the math.
  - Validation: total discount can't exceed subtotal.

## 6. Status machine

- **Draft** — editable, number not locked.
- **Sent** — number locked, invoice immutable except for payments + status + credit-note linkage.
- **Partial** — auto when 0 < amountPaid < total.
- **Paid** — auto when amountPaid >= total.
- **Overdue** — derived (not persisted) when dueDate < today AND status is Sent/Partial.

Editing a Sent+ invoice is blocked. To correct, issue a credit note + new invoice.

## 7. Credit notes

- Separate document type, separate numbering (CN-0001, CN-0002…).
- References the original invoice via `originalInvoiceId`.
- Negative amounts permitted.
- Original invoice's detail screen shows linked credit notes and a "Net balance" summary.
- Soft-deletable only.

## 8. Auth & security

- Firebase Anonymous Auth on first launch — creates a stable UID with no friction.
- Local biometric/PIN gate on app open via `expo-local-authentication`. Web has no biometric — PIN only on web.
- PIN is 4–6 digits, stored as a salted hash in `settings.pinHash`.
- Account-linking banner on dashboard: "Secure your data — link an account." Uses Firebase `linkWithCredential` so the existing UID + all data is preserved. Apple Sign-In + Google Sign-In supported. Banner re-appears every 30 days if dismissed without linking.
- Firestore security rules: every read/write must verify `request.auth.uid == userId` for that subtree. Cloud Functions use Firebase Admin and re-check ownership before any operation.

## 9. Distribution & compliance

- Apple Developer Program ($149/yr AUD), Google Play Console ($25 once), domain (~$15/yr) — confirmed budget.
- Bundle ID format `com.<domain>.folio` — locked at first EAS Build, hard to change. Ask me to confirm before the first EAS Build.
- App icon + splash screens generated from a single source via Expo asset pipeline.
- Privacy policy + terms — to be drafted as Markdown files later (deferred). I'll deploy them on GitHub Pages.
- App Store Privacy: "Data not collected." App Tracking Transparency: not used.

## 10. Data lifecycle

- Export CSV: two-file ZIP — `invoices.csv` (one row per invoice with totals) + `lineItems.csv` (one row per line item, FK to invoice number). Includes credit notes.
- Export PDFs: ZIP of every invoice + credit note PDF. Cloud Function for >50 docs, client-side otherwise.
- Soft delete: Sent / Partial / Paid / Overdue invoices and all credit notes. Visible only in Settings → Archived. ATO 5-year retention satisfied.
- Hard delete: Drafts only, single confirm.
- No import in v1.
- Offline: Firestore default cache only. No queue-and-retry. PDF generation works offline; email send requires connection (button shows "Offline — try again when connected" and disables).

## 11. Email send (Cloud Function)

`sendInvoiceEmail({ invoiceId, to, subject, body, attachments })`:

1. Verify auth UID owns the invoice.
2. Load PDF from Storage (regenerate if missing).
3. Append up to 5 user-uploaded attachments (≤10 MB combined, hard-limit before SendGrid's 30 MB cap).
4. Call SendGrid v3 with personalizations + Dynamic Template + attachments (base64).
5. Mark `sentAt`, transition Draft → Sent if needed.
6. Attachments are NOT persisted to Storage — uploaded with the function call, forwarded to SendGrid, discarded.

## 12. PDF specification

- A4 (210 × 297 mm), margins 20 mm top/bottom, 15 mm left/right.
- "Classic professional" template: serif headings (Playfair or Source Serif), hairline table borders, single navy accent color matching the app (`#0B3D5C`).
- ATO mandatory fields baked in: words "Tax Invoice", business name + ABN, issue date, buyer name (required ≥$1,000), per-item description/qty/price, GST line(s).
- Multi-page: compact header (logo + business info, smaller than first-page version) on every page, "Page X of Y" in footer. Totals + payment details only on the final page.
- Generate via `expo-print` from an HTML/CSS template. Cache to Firebase Storage at `users/{uid}/invoices/{invoiceId}-{contentHash}.pdf`.

## 13. UI/UX specification

### Visual identity

- **Vibe:** Professional/financial — Xero/MYOB territory. Structured, trustworthy, restrained.
- **Theme:** Auto follow system, both light + dark built day one.

### Color tokens (set up as NativeWind theme)

```
Accent:           #0B3D5C   Hover: #1B5A82
Status — paid:    #0F8A5F   sent:    #C77A0A
         overdue: #C0392B   partial: #1F6FB2   draft: #6B7280

Light mode:    bg #FAFAF7  surface #FFFFFF  border #E5E5E0
               text #111827 / muted #4B5563
Dark mode:     bg #0E1116  surface #171B22  border #2A2F38
               text #F3F4F6 / muted #9CA3AF
```

Status color uses: chip fill when selected, badge pill, left edge stripe on overdue rows, KPI amount color. Never on body text.

### Typography (Inter for UI, serif for PDF only)

- Display 32/700 — dashboard greeting, big totals
- H1 24/600, H2 18/600, Body 15/400, Label 13/500 (+0.2 letter-spacing), Caption 12/400
- Enable Inter's `tnum` font feature for all currency and dates

### Spacing & shape

4 px scale (4/8/12/16/24/32/48). Card radius 12, button radius 10, chip radius 999. 1 px hairline borders. Subtle shadows in light mode only — borders in dark mode.

### Navigation

- **Mobile:** 4-tab bottom bar — Dashboard / Invoices / Clients / Settings (Lucide icons).
- **Web:** Left sidebar 240 px, same items, collapsible to icons-only at <1024 px.
- **Tablet:** Left rail at ≥768 px, bottom tabs below.

### Screens

**Dashboard.** Greeting + period selector top-right (This month / Quarter / FY). Three KPI cards: Outstanding (largest), Overdue (red), Paid this period (green). "Needs attention" section: up to 5 overdue + due-this-week invoices. "Recent activity": last 5 invoices. Pull-to-refresh on mobile. Account-linking banner if anonymous-only.

**Invoices list.** Sticky search bar + horizontally scrollable status chips (All / Draft / Sent / Partial / Overdue / Paid). Filter persists across navigation. Comfortable two-line rows:

```
INV-0042                                     $1,320.00
Acme Pty Ltd                       Due in 3 days  [Sent]
```

Tabular numerals so totals align. Status badge pill on right. Overdue rows get a 3 px left stripe in `--overdue`. FAB bottom-right on mobile (above tab bar with safe-area inset), primary "+ New invoice" button in header on web.

**Invoice editor.** Sticky header (number + status pill + close). Sticky footer (live total left, Save Draft + Save & Send right). Body = four collapsible cards: Client / Items / Payment / Notes. First create: all expanded. Subsequent edits: collapsed except sections with errors. Inline validation as you type (not on submit). Auto-save every 3 s while in Draft. Per-line GST override hidden behind a small "Tax" link (defaults to 10%).

**Invoice detail / preview.** PDF rendered in WebView at top (tap to fullscreen). Below: status, totals, payments log, action buttons — Send, Mark paid, Record payment, Duplicate, Issue credit note, Download, Archive.

**Clients.** Search + alphabetical list. Add/edit. Soft-delete blocked if client has invoices (toast: "Has 3 invoices, can't delete").

**Settings.** Grouped sections: Business profile (logo, name, ABN, address, email, phone), Numbering (mode toggle + format string with live preview), Line item mode (Basic / Units), Default GST rate, Default currency, Default payment terms, Payment details (BSB + Acc, PayID, free-text notes for Stripe/crypto/etc.), Line item library, Security (PIN, biometric toggle), Theme (System/Light/Dark), Data (Export CSV / Export PDFs ZIP / Archived), About + Privacy + Terms links.

**Onboarding.** 4 steps, all skippable to dashboard: Business profile → Logo upload → Payment details → PIN setup. Skipped fields surface as a dismissible dashboard banner until completed.

### List interactions

- Swipe-left reveals: Mark paid (green) + Delete (red, requires confirm).
- Swipe-right on Sent/Partial reveals Record payment.
- Long-press opens context menu (Edit, Duplicate, Share, Delete).
- Haptics: light tap on swipe reveal, success on mark paid, warning on delete confirm.

### Empty states

Minimal — no illustrations. Centered text + single primary CTA. "No invoices yet. Create your first invoice." Filtered empties: "No overdue invoices."

### Forms & inputs

- Labels above inputs (not floating).
- 44 px minimum tap target.
- Currency inputs right-aligned with $ prefix.
- Native date picker on mobile, `<input type="date">` on web.
- Errors shown inline below the field in `--overdue`. Never as alerts.
- Required fields marked with a subtle dot (not asterisk).

### Status pills & badges

11 px label, 4 / 8 px padding, status color at 12% alpha background + full-strength text. Sentence case (no uppercase).

### Motion

- Page transitions: 200 ms slide on mobile, fade on web.
- Card collapse: 180 ms ease-out.
- Swipe actions: spring animation.
- Skeleton loaders for lists and detail.
- Optimistic updates on status changes — immediate UI flip with quiet 4 s undo toast.

### Accessibility

WCAG AA throughout. Dynamic type to 130%. `accessibilityLabel` on every icon-only button. Focus rings on web (2 px accent outline). VoiceOver/TalkBack tested for editor + list.

### Voice & copy

Concise, second person, sentence case, no jargon. Specific errors ("ABN must be 11 digits", not "Invalid input"). CTA copy = verbs ("Create your first invoice").

### Component inventory (build once, reuse — ~20 components)

`Button` (primary/secondary/ghost/danger), `IconButton`, `Input`, `NumberInput`, `CurrencyInput`, `DateInput`, `Select`, `Switch`, `Chip`, `StatusBadge`, `Card`, `CollapsibleCard`, `ListRow`, `EmptyState`, `Skeleton`, `Toast`, `ConfirmDialog`, `BottomSheet` (mobile) / `Modal` (web), `KPICard`, `Stepper`, `FAB`.

## 14. Phased build plan

1. **Foundation:** Expo + Firebase scaffold, NativeWind theme tokens (light + dark), the ~20 design-system components, anonymous auth, PIN/biometric gate, Firestore security rules.
2. **Core MVP:** Profile + logo, single-currency invoices, basic line items, 10% GST, classic PDF, share-sheet send, clients list, dashboard + status machine.
3. **Compliance & polish:** Multi-currency, multi-GST per line, both discount types, credit notes, payment tracking, custom numbering, line item library, archived view, exports.
4. **Send pipeline:** Cloud Function + SendGrid + email attachments (≤5 files, ≤10 MB).
5. **Pre-launch:** Account linking, store assets, privacy/terms deploy, TestFlight + Play internal track.
6. **Submit.**

## 15. What I want you to do first

Before any code:

1. Confirm the bundle ID format with me. I'll likely use `com.folio.au` or similar pending domain availability.
2. Confirm Node version and package manager preference (default to pnpm unless I object).
3. List the exact dependencies you'll install with versions, before running `npm install`.

Then start with **Phase 1 only (foundation):**

- Initialize the Expo + TypeScript + Expo Router project.
- Configure NativeWind for iOS, Android, and Web with the light + dark theme tokens above.
- Set up Firebase (initialize app, Firestore, Auth, Storage). Use `.env` for config; do NOT commit secrets.
- Implement anonymous auth on first launch + PIN/biometric gate.
- Build the ~20 design-system components in NativeWind, with Storybook-style preview screen accessible in dev.
- Build the Invoices list screen as the proof-of-concept (with mocked data) — search bar, status chips, comfortable rows, swipe actions, FAB on mobile, header button on web. This screen has to feel right on iOS, Android, and Web before we proceed.
- Write the Firestore security rules (deny by default, owner-only access).
- Set up EAS configuration files (don't build yet).

Stop and show me the result before continuing to Phase 2.

## 16. Working agreement

- TypeScript strict mode on. No `any` unless absolutely justified.
- All money math via Dinero.js. Currency always explicit.
- Snapshot pattern for client + payment details — historical invoices never mutate when settings change.
- All Firestore writes that touch counters use transactions.
- No floats for money, anywhere, ever.
- Every icon-only button gets an `accessibilityLabel`.
- Tests: prioritize the money-math, status-machine, and discount/GST calculation modules with unit tests. UI tests deferred for now.
- Commit frequently with conventional commit messages.

If anything in this spec is unclear, ask before assuming. If you spot a contradiction, flag it. Do not silently change my decisions.

---

## Decisions confirmed at kickoff (2026-05-01)

- **Bundle ID + Android package:** `com.frizzo.folio`
- **App slug:** `folio`
- **Node version:** 22 LTS (pinned via `.nvmrc` and `engines.node` in `package.json`)
- **Package manager:** `npm` (commit `package-lock.json`)
