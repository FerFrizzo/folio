# Auth providers — Apple + Google sign-in

Phase 5 wires Apple Sign-In + Google Sign-In through Firebase
`linkWithCredential`, preserving the user's existing anonymous UID and
all their data. This doc walks through what you need to set up in each
provider's console for the wiring to work.

The runtime code lives in `src/features/auth/linking/`:

- `apple.ts` — iOS native + web. Android isn't supported by Apple's SDK.
- `google.ts` — iOS + Android via `expo-auth-session`, web via Firebase's
  `signInWithPopup`.

## Apple

### When to set this up

Required before TestFlight if you want the "Continue with Apple" button
to be more than a stub. Apple requires Sign in with Apple on apps that
offer any social-sign-in option, so this is non-negotiable for store
review.

### Apple Developer Console

1. Go to <https://developer.apple.com/account/resources/identifiers/list>.
2. Pick your bundle ID (`com.frizzo.folio`), tick **Sign in with Apple**,
   save.
3. *(Web only)* Create a **Services ID** for the OAuth flow:
   - Identifiers → + → Services IDs.
   - Identifier: `com.frizzo.folio.web` (or similar).
   - Tick Sign in with Apple → Configure → set the Web Domain to your
     deployed Folio web host (e.g. `folio-web.example.com`) and Return
     URL to `https://folio-web.example.com/auth/apple/callback`.
   - Save.

### Firebase Console

1. **Authentication → Sign-in method → Apple → Enable**.
2. Service ID: paste the one you created above (web only — leave blank
   if you don't ship a web build).
3. Apple team ID: from Apple's console.
4. Key ID + Private key: generate via Apple's console (the same kind of
   key you'd generate for ASCAPI), download, paste both values.

### App config

Already in `app.config.ts`:
- `ios.usesAppleSignIn: true`
- `plugins: ["expo-apple-authentication"]`

No extra env vars required for native iOS — Apple SDK handles the
rest. For web, set:

```sh
EXPO_PUBLIC_APPLE_SERVICE_ID=com.frizzo.folio.web
```

## Google

### Google Cloud Console

You need three OAuth 2.0 client IDs — one per platform.

1. Go to <https://console.cloud.google.com/apis/credentials> in the same
   project Firebase uses (Firebase auto-creates a Google Cloud project
   under the hood).
2. **Create credentials → OAuth client ID**:
   - **iOS** client:
     - Application type: iOS.
     - Bundle ID: `com.frizzo.folio`.
   - **Android** client:
     - Application type: Android.
     - Package name: `com.frizzo.folio`.
     - SHA-1 fingerprint: from the EAS build output (or run
       `eas credentials` and copy from the production keystore).
   - **Web** client:
     - Application type: Web.
     - Authorised redirect URIs:
       - `https://folio-web.example.com/auth/google/callback`
       - `https://<your-firebase-project>.firebaseapp.com/__/auth/handler`
3. Copy each Client ID. They look like
   `1234567890-abcdefg.apps.googleusercontent.com`.

### Firebase Console

1. **Authentication → Sign-in method → Google → Enable**.
2. Web SDK config: select the Web client ID from above.
3. Save.

### Env vars

Set these in your `.env` (and EAS environment variables for build/deploy):

```sh
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1234567890-ios.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=1234567890-android.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-web.apps.googleusercontent.com
```

`expo-auth-session/providers/google` reads these via the `useAuthRequest`
hook on native; the Firebase Web SDK reads the web client ID from the
Firebase project config (so the env var is mostly informational on web).

## Verifying the link

1. Sign in anonymously (default on first launch — Folio does this for you).
2. Create a couple of invoices so there's data on the anonymous UID.
3. Dashboard → "Continue with Apple" / "Continue with Google".
4. Native sheet / popup prompts.
5. On success: the banner unmounts and the toast says "Account linked."
6. Verify in the Firebase Auth console: the same UID is now a Linked
   account with the provider's email attached.
7. Bonus check: sign out → sign back in via the provider → all the
   invoices you created on the anonymous UID are still there.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `auth/credential-already-in-use` | The Apple/Google account is linked to a different anonymous Folio install. Sign out first, or use the "switch account" fallback. |
| `auth/popup-closed-by-user` (web) | User dismissed the popup. Surface as "Sign-in cancelled" toast. |
| `Unable to verify ID token` (Google native) | Wrong client ID. Double-check the platform → client ID mapping. |
| Apple Sign-In button missing on Android | Expected — Apple's SDK doesn't run on Android. The banner hides the Apple button there. |
| Web sign-in works but `linkWithCredential` says "user not found" | Anonymous user was reset before linking. Reload the page; AuthProvider re-creates a fresh anonymous UID. |
