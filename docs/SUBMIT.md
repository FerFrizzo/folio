# Folio — Phase 6 Submit hand-off

Phases 1–5 are done. The codebase is App Store + Play submission ready in
every place that doesn't require your credentials. Everything below
needs *you* — paid developer accounts, signing keys, store listings, and
the actual `eas submit` runs.

Tick the boxes as you go. Skim time for the whole list: about a day if
the developer-account verifications come back fast, longer if they don't.

---

## Pre-flight

Before any of this, make sure the codebase still passes every gate.

- [ ] From the repo root: `npm run preflight`
  - Runs: icons regeneration, tsc, lint, jest, expo-doctor,
    `functions:build`, `functions:test`. Bails on the first failure.

If preflight is red, fix it first. Don't try to ship a broken bundle.

---

## 1. One-time accounts

- [ ] **Apple Developer Program** — enrol at
  <https://developer.apple.com/programs/enroll/>. ~$149 AUD/yr.
  Verification can take 24–48h. Use an Apple ID dedicated to your
  business.
- [ ] **Google Play Console** — sign up at
  <https://play.google.com/console/signup>. ~$25 AUD one-time.
  Identity verification + a phone number on file.
- [ ] **SendGrid** — sign up at <https://signup.sendgrid.com/>.
  Free tier (~100 emails/day) is fine for the first weeks.
  Walkthrough: [`SENDGRID.md`](./SENDGRID.md).
- [ ] **Firebase project** — already set up if Phases 1–5 ran.
  Confirm: <https://console.firebase.google.com/>.
- [ ] **GitHub account** for hosting Privacy + Terms pages — already
  set up if you've been pushing the repo.

---

## 2. Provider keys + signing

- [ ] **App Store Connect API key**
  1. App Store Connect → Users and Access → Keys → App Store Connect
     API → +.
  2. Role: *App Manager*.
  3. Download the `.p8` once. Drop it in `secrets/AuthKey.p8`.
  4. Note the Key ID + Issuer ID for the env vars below.
- [ ] **Google Play service account**
  1. Google Cloud Console (same project as Firebase) → IAM & Admin
     → Service Accounts → Create.
  2. Generate a JSON key. Drop it at
     `secrets/play-service-account.json`.
  3. Play Console → Setup → API access → link the service account
     and grant *Release Manager* on your app.
- [ ] **SendGrid API key**
  1. SendGrid → Settings → API Keys → Create API Key.
  2. Name "Folio prod", *Restricted Access* with `Mail Send: Full
     Access`.
  3. Copy the key (shown once).
- [ ] **SendGrid Dynamic Template**
  1. SendGrid → Email API → Dynamic Templates → Create.
  2. Add Version → Code Editor → paste
     [`docs/sendgrid/folio-invoice-email.html`](./sendgrid/folio-invoice-email.html).
  3. Copy the template ID (`d-...`).
- [ ] **SendGrid sender verification**
  1. SendGrid → Settings → Sender Authentication.
  2. Single Sender Verification with the email address that will appear
     in `from`.
- [ ] **Apple Sign-In Service ID** (web only, optional)
  1. Apple Developer → Identifiers → + → Services IDs.
  2. Configure Sign in with Apple, set your web return URL.
  3. Walkthrough: [`AUTH_PROVIDERS.md`](./AUTH_PROVIDERS.md).
- [ ] **Google OAuth client IDs** (three: iOS, Android, Web)
  1. Google Cloud Console → APIs & Services → Credentials → +.
  2. Walkthrough: [`AUTH_PROVIDERS.md`](./AUTH_PROVIDERS.md).

---

## 3. Configuration

- [ ] **`.env` populated**
  ```sh
  cp .env.example .env
  ```
  Fill these in:
  ```
  EXPO_PUBLIC_FIREBASE_API_KEY=...
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
  EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
  EXPO_PUBLIC_FIREBASE_APP_ID=...
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
  EXPO_PUBLIC_APPLE_SERVICE_ID=...   # web only; OK to leave blank for native-first
  EXPO_PUBLIC_PRIVACY_URL=https://<github-user>.github.io/folio/privacy/
  EXPO_PUBLIC_TERMS_URL=https://<github-user>.github.io/folio/terms/
  ```
- [ ] **Functions secrets** (production)
  ```sh
  firebase functions:secrets:set SENDGRID_API_KEY
  firebase functions:secrets:set SENDGRID_TEMPLATE_ID
  firebase functions:secrets:set SENDGRID_SENDER
  ```
- [ ] **EAS submit env vars** (set in your shell or in EAS project envs):
  ```sh
  export APPLE_ID="you@example.com"
  export ASC_APP_ID="1234567890"
  export APPLE_TEAM_ID="ABCDE12345"
  export ASC_API_KEY_ID="ABCDE12345"
  export ASC_API_KEY_ISSUER_ID="69a6de7..."
  ```

---

## 4. Deploy backend

Functions, Firestore rules, Storage rules — all need to be live before
TestFlight reviewers test the Send email flow.

- [ ] `eas init` from the repo root (one-time — links the local project
  to an EAS project).
- [ ] `firebase use --add` (one-time — pick the production Firebase
  project).
- [ ] `firebase deploy --only firestore:rules,storage`
- [ ] `firebase deploy --only functions`
  - First deploy fetches the chromium binary; takes a few minutes.
- [ ] Verify in Firebase Console → Functions that
  `sendInvoiceEmail` and `exportPdfsZip` show as deployed.

---

## 5. Deploy Privacy + Terms

- [ ] **Edit copy** (review and replace placeholders before publishing):
  - `docs/legal/privacy.md`
  - `docs/legal/terms.md` — has a "Contact" section with a literal
    placeholder; put your real contact email in.
- [ ] **Enable GitHub Pages**
  - GitHub repo → Settings → Pages.
  - Source: **GitHub Actions**.
- [ ] **Trigger the workflow**
  - Push the changed Markdown to `master` (or `main`), or run the
    "Deploy legal pages" workflow manually from the Actions tab.
- [ ] **Verify** the URLs resolve:
  - `https://<github-user>.github.io/folio/privacy/`
  - `https://<github-user>.github.io/folio/terms/`
- [ ] Update `EXPO_PUBLIC_PRIVACY_URL` + `EXPO_PUBLIC_TERMS_URL` in
  `.env` to point at the live URLs.

---

## 6. Store listings

### App Store Connect

- [ ] App Store Connect → Apps → + New App
  - Bundle ID: `com.frizzo.folio`
  - SKU: `folio-ios`
  - Primary language: English (Australia)
- [ ] Paste copy from
  [`docs/store-listing/app-store.md`](./store-listing/app-store.md):
  - [ ] Name + Subtitle
  - [ ] Promotional text
  - [ ] Description
  - [ ] Keywords
  - [ ] Support URL (your GitHub Pages URL)
  - [ ] Marketing URL (optional)
  - [ ] Privacy Policy URL
  - [ ] What's New
  - [ ] Age rating: 4+
  - [ ] Category: Business (primary), Finance (secondary)
- [ ] **App Privacy** questionnaire — answers in the listing doc.
- [ ] **Sign in with Apple** capability is enabled on the App ID
  (Certificates, Identifiers & Profiles → Identifiers → your bundle).

### Play Console

- [ ] Play Console → Create app
  - App name: Folio — Tax Invoices
  - Default language: English (Australia)
  - App or game: App
  - Free or paid: Free
  - Tick all required declarations.
- [ ] Paste copy from
  [`docs/store-listing/play-store.md`](./store-listing/play-store.md):
  - [ ] Short + full description
  - [ ] Tags + Category
  - [ ] Privacy policy URL
- [ ] **Data safety** form — disclosures in the listing doc.
- [ ] **Content rating** — fill the questionnaire; result should be
  Everyone / 3+.

---

## 7. Capture screenshots

Both stores require a minimum of 2 screenshots per device class. See
[`assets/screenshots/README.md`](../assets/screenshots/README.md) for
required dimensions + a recommended six-screen story.

Per-platform sets to capture:
- [ ] iOS 6.7" iPhone (1290 × 2796): 5 screens minimum.
- [ ] *(Optional)* iPad 12.9" Pro (2048 × 2732): if you want the iPad
  listing.
- [ ] Android phone (1080 × 1920): 5 screens minimum.

Upload to App Store Connect / Play Console under each app's "App store
listings" / "Main store listing" → Screenshots.

---

## 8. Build + submit

You're at the actual ship now.

- [ ] **iOS preview build** (smoke-test before going to TestFlight):
  ```sh
  eas build --platform ios --profile preview
  ```
  Sideload via TestFlight or `eas internal-distribution` once the build
  finishes. Run the smoke-test checklist below.
- [ ] **iOS production build → TestFlight**:
  ```sh
  eas build --platform ios --profile production --auto-submit
  ```
  ~20 min. Apple's static analysis adds ~10 min. The build appears in
  TestFlight once analysis passes.
- [ ] **Android internal-track build**:
  ```sh
  eas build --platform android --profile production --auto-submit
  ```
  ~10 min. Lands as a *draft* on Play Console internal track.
- [ ] In Play Console → Internal testing, **promote** the draft to
  Active so testers can install.
- [ ] Add yourself + early testers:
  - App Store Connect → TestFlight → Internal Testing.
  - Play Console → Testing → Internal testing → Testers.

### Smoke-test checklist (do on a real device for both platforms)

- [ ] Open app on a fresh install. Anonymous UID created.
- [ ] Walk through onboarding. Add business profile + payment details.
- [ ] Create a client.
- [ ] Create an invoice with 3 line items + a 10% whole-invoice
  discount. Save & Send. Confirm the share sheet opens with the PDF.
- [ ] Open the sent invoice → tap **Send email** → enter your own
  email → confirm it lands in the inbox with the PDF attached.
- [ ] On the dashboard banner, tap **Continue with Apple** /
  **Continue with Google**. Confirm the link succeeds and the
  banner unmounts.
- [ ] Verify in the Firebase Auth console that the same UID is now
  marked as Linked, and the existing invoice still belongs to it.
- [ ] Settings → About → tap Privacy → confirms your hosted GitHub
  Pages URL opens.

If any of these fail, fix in code, re-run `npm run preflight`, cut a
new build, and re-test.

---

## 9. Submit for review

- [ ] **App Store**: TestFlight → Internal Testing → confirm tester
  feedback is positive → App Store → "+ Add for Review" on the new
  version → fill the App Review Information (demo account if needed),
  contact info, notes for reviewer.
  - Suggested reviewer note: "Folio is a single-user invoicing app. To
    test the Send Email flow, please use any email address — the email
    is delivered via SendGrid using our private API key. Sign in with
    Apple is supported and links to a Firebase anonymous account."
- [ ] **Play Console**: Promote internal testing → Closed testing →
  Open testing → Production. (Or skip straight to Production once
  internal feedback is settled.)
- [ ] **Both stores**: monitor reviewer feedback over 1–3 business
  days. Apple often asks for additional usage strings or a video walk-
  through; Play occasionally flags the Data Safety form.

---

## 10. After approval

- [ ] Tag the release in git: `git tag v1.0.0 && git push origin v1.0.0`.
- [ ] Bump `app.config.ts` version to `1.0.1` (or `1.1.0` for a
  feature release).
- [ ] Cut an EAS Update for hotfixes that don't need native code:
  ```sh
  eas update --channel production --message "fix: …"
  ```
- [ ] For native-affecting changes, repeat the build → submit cycle.

---

## Common reviewer rejections + fixes

| Symptom | Fix |
| --- | --- |
| "Missing Privacy Policy URL" | Set `EXPO_PUBLIC_PRIVACY_URL` to the live GitHub Pages URL and rebuild — but the public listing also needs the URL pasted. |
| Apple: "Missing usage description" | Add the missing `NS*UsageDescription` to `app.config.ts` ios.infoPlist and rebuild. |
| Apple: "Sign in with Apple required" | Already enabled. Re-check the App ID has the capability ticked. |
| Play: "Data safety inaccurate" | Re-check the disclosures match `docs/store-listing/play-store.md`. |
| "App crashes on launch" | The Firebase config envs aren't set in the production EAS env. Set them in EAS project → Environment variables. |
| "Send email fails for reviewer" | Functions weren't deployed. `firebase deploy --only functions` and resubmit. |

---

## Checklist summary (everything you need to tick)

- [ ] Apple Developer Program enrolled
- [ ] Google Play Console enrolled
- [ ] SendGrid account + verified sender + Dynamic Template
- [ ] Firebase project linked
- [ ] All env vars + Functions secrets set
- [ ] Backend deployed (rules + storage + functions)
- [ ] Privacy + Terms hosted on GitHub Pages
- [ ] Store listings filled (App Store Connect + Play Console)
- [ ] Screenshots captured + uploaded
- [ ] iOS production build → TestFlight
- [ ] Android production build → Play internal track
- [ ] Smoke-test on real devices
- [ ] Submitted for review on both stores
- [ ] Approved + live

When that last box is ticked, the build is done. The repo, the docs,
the brand mark — all of those are yours to evolve from here.
