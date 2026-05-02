# Signing keys

Drop the following files in this directory once you've provisioned your
Apple / Google credentials. Everything in `secrets/` is gitignored — only
this README and the `.gitignore` are tracked.

- `AuthKey.p8` — App Store Connect API key (Settings → Users and Access →
  Keys → App Store Connect API). Path: matches `ascApiKeyPath` in `eas.json`.
- `play-service-account.json` — Google Play service account with the
  *Release Manager* role on your app. Path: matches `serviceAccountKeyPath`
  in `eas.json`.

`docs/RELEASING.md` walks through where each comes from and what to set in
the corresponding env vars (`APPLE_ID`, `ASC_APP_ID`, `APPLE_TEAM_ID`,
`ASC_API_KEY_ID`, `ASC_API_KEY_ISSUER_ID`).
