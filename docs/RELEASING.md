# Releasing Folio

The path from "code is good" to "TestFlight + Play internal track" is in
this doc. Phase 5 sets up the configuration; this walkthrough is the
playbook for actually running the first build + submit.

For the SendGrid + Cloud Functions side, see [`SENDGRID.md`](./SENDGRID.md).
For the auth-provider provisioning, see [`AUTH_PROVIDERS.md`](./AUTH_PROVIDERS.md).

## One-time setup

### Apple

1. **Enrol the Apple Developer Program** (~$149 AUD/yr) at
   <https://developer.apple.com/programs/enroll/>. Plan for 24–48h verification.
2. In **App Store Connect → Apps → +** create a new app:
   - Bundle ID: `com.frizzo.folio` (must match `app.config.ts`).
   - SKU: anything unique; `folio-ios` works.
   - Primary language: English (Australia).
3. **App Store Connect API key**:
   - **Users and Access → Keys → App Store Connect API → +**.
   - Role: *App Manager* (sufficient for `eas submit`).
   - Download the `.p8` file (Apple shows it once). Drop it at
     `secrets/AuthKey.p8`.
   - Note the Key ID and Issuer ID — those go in env vars below.
4. **Capabilities**: enable Sign in with Apple on the App ID
   (Certificates, Identifiers & Profiles → Identifiers → your bundle →
   Capabilities). EAS Build sets up provisioning profiles automatically.

### Google Play

1. **Create a Google Play Console account** (~$25 AUD one-time) at
   <https://play.google.com/console/signup>.
2. Create a new app:
   - Default language: English (Australia).
   - App or game: App.
   - Free or paid: Free.
   - Declarations: tick the required boxes.
3. **Service account for `eas submit`**:
   - In Google Cloud Console for the linked project → IAM & Admin →
     Service Accounts → Create.
   - Role: *Service Account User*.
   - Generate a JSON key. Drop it at `secrets/play-service-account.json`.
   - Back in Play Console → Setup → API access, link the service account
     and grant it the *Release Manager* permission for your app.

### Firebase

EAS doesn't deploy Functions — that's a separate Firebase CLI step. Run
once before the first TestFlight build so reviewers can hit Send Email:

```sh
firebase deploy --only functions,firestore:rules,storage
```

(Per `SENDGRID.md`, set the SendGrid secrets first.)

## Env vars + secrets

`eas.json` references env vars for the App Store Connect submit flow.
Set these locally (or in EAS's environment-variables UI) before running
`eas submit`:

```sh
export APPLE_ID="you@example.com"
export ASC_APP_ID="1234567890"        # App Store Connect app ID
export APPLE_TEAM_ID="ABCDE12345"
export ASC_API_KEY_ID="ABCDE12345"
export ASC_API_KEY_ISSUER_ID="69a6de7..."
```

The Android side reads `secrets/play-service-account.json` directly.

## First build → TestFlight

```sh
# One-time: link the project to EAS.
eas init

# Trigger the build. EAS asks to manage your Apple credentials the first
# time — say yes; it'll provision certs + profiles for you.
eas build --platform ios --profile production --auto-submit

# `--auto-submit` runs `eas submit` after the build finishes. Without it,
# wait for the build artifact and then run:
# eas submit --platform ios --profile production --latest
```

The build queues, takes ~15–25 minutes, and uploads to TestFlight. Apple
runs a static analysis (~10 min) before the build is testable. Add yourself
as an internal tester in App Store Connect → TestFlight to install via the
TestFlight app on your iPhone.

## First build → Play internal track

```sh
eas build --platform android --profile production --auto-submit
```

The build queues (~10–15 minutes), produces an `.aab`, and uploads to
the Play Console internal track. Add testers in Play Console →
Testing → Internal testing.

The release lands as a **draft**. In the Play Console, promote to active
once you've smoke-tested the install on a device.

## After the first build

### Smoke checklist

- Open the app, sign in anonymously, walk onboarding.
- Create a client, create an invoice, Save & Send.
- Tap Send email → verify the email arrives with the PDF attached.
- Tap Mark paid → verify status flips and persists.
- Tap Settings → About → Privacy → verify the link-out opens the
  GitHub Pages site.

### App Store Privacy disclosures

App Store Connect → App Privacy → Edit. Even though Folio collects "no
data" by analytics standards, the privacy questionnaire requires
disclosing:

- **Contact info → Email address**: collected, used for app
  functionality (sending invoices), linked to the user's account
  (their own data), not used for tracking.
- **Identifiers → User ID**: the anonymous Firebase UID, collected for
  app functionality, linked to the user, not used for tracking.

### Play Data safety

Play Console → App content → Data safety. Same answers — minimal
collection, all for app functionality, no third-party sharing beyond
Firebase + SendGrid (declared as service providers).

## OTA updates (EAS Update)

For patches that don't change native code:

```sh
eas update --channel production --message "fix: ..."
```

The `runtimeVersion: { policy: "appVersion" }` in `app.config.ts` means
each store version cuts a fresh OTA channel — older binaries don't
accidentally pick up incompatible JS bundles.

Bump `version` in `app.config.ts` whenever you add native dependencies
or a breaking JS change, then cut a new EAS Build.

## Common issues

| Symptom | Cause |
| --- | --- |
| `eas submit` fails with "Could not authenticate" | Bad `ASC_API_KEY_ID` / `ASC_API_KEY_ISSUER_ID` — copy from the App Store Connect API key page exactly. |
| Apple rejects build for "missing usage description" | Add the `NS*UsageDescription` to `app.config.ts` ios.infoPlist. |
| Play rejects with "missing privacy policy" | The Play Console listing requires a privacy URL; paste the GitHub Pages URL. |
| Reviewers hit "Send email" and get an error | Functions weren't deployed before submission. `firebase deploy --only functions` and resubmit. |
| GitHub Pages 404 right after the workflow runs | DNS propagates over a few minutes. The workflow's URL is in Actions → Deploy legal pages. |
