# SendGrid setup for Folio

The `sendInvoiceEmail` Cloud Function uses [SendGrid v3 Mail Send](https://docs.sendgrid.com/api-reference/mail-send/mail-send) with a Dynamic Template. This walkthrough takes you from "fresh SendGrid account" to "first invoice email landed in an inbox".

## 1. Create a SendGrid account

1. Sign up at <https://signup.sendgrid.com/>. The Free tier covers ~100 emails/day, which is plenty for solo invoicing. Pricing tiers are on <https://sendgrid.com/pricing/>.
2. Verify your account email.

## 2. Verify a sender identity

SendGrid won't send mail unless the `from` address is verified.

1. **Settings → Sender Authentication**.
2. Pick **Single Sender Verification** (simplest) and verify the email address that will appear in `from` (e.g. `hi@frizzo.au`). Check that inbox for the verification mail.
3. *(Optional, recommended for production)* set up **Domain Authentication** to add SPF/DKIM records to your DNS — improves deliverability.

## 3. Create a Dynamic Template

1. **Email API → Dynamic Templates → Create a Dynamic Template**.
2. Name it "Folio invoice". Click **Add Version → Code Editor**.
3. Paste the contents of [`docs/sendgrid/folio-invoice-email.html`](./sendgrid/folio-invoice-email.html) into the HTML editor and save. Preview should render with placeholder text.
4. Copy the template ID from the URL — it looks like `d-1234567890abcdef`.

The template uses these merge fields, populated by the function from the invoice + your settings + the user's input on the Send sheet:

| Field            | Source                                               |
| ---------------- | ---------------------------------------------------- |
| `{{businessName}}` | `users/{uid}/profile/main.businessName`              |
| `{{number}}`       | `invoice.number`                                     |
| `{{clientName}}`   | `invoice.clientSnapshot.name`                        |
| `{{total}}`        | Formatted amount (e.g. `$1,320.00`)                  |
| `{{dueDate}}`      | ISO `YYYY-MM-DD` from the invoice                    |
| `{{body}}`         | The free-text Body the user typed in the Send sheet  |
| `{{pdfUrl}}`       | Signed download URL of the cached PDF (7-day expiry) |

## 4. Generate an API key

1. **Settings → API Keys → Create API Key**.
2. Name it "Folio prod" (or "Folio dev" if you're testing locally).
3. Permission: **Restricted Access**, with `Mail Send: Full Access` toggled on. Everything else off.
4. Copy the key once — SendGrid won't show it again.

## 5. Wire the secrets into Firebase Functions

Phase 4 uses Firebase v2 callable functions, which read secrets via `defineSecret`. From the repo root:

```sh
firebase functions:secrets:set SENDGRID_API_KEY        # paste the SG. key
firebase functions:secrets:set SENDGRID_TEMPLATE_ID    # paste the d-... id
firebase functions:secrets:set SENDGRID_SENDER         # the verified from address
```

Verify:

```sh
firebase functions:secrets:access SENDGRID_API_KEY
```

For local emulator development, copy `functions/.env.example` to `functions/.env` and fill in the same three values. The emulator picks them up automatically.

## 6. Deploy

```sh
npm --prefix functions run build
firebase deploy --only functions
```

The first deploy takes a few minutes — Cloud Functions warms up the puppeteer + chromium binary and provisions a 1 GiB / 2 GiB instance for the two callables.

## 7. Send a test invoice

1. In the app, send a Sent invoice to your own email via the Send sheet on the invoice detail screen.
2. The first email after a deploy can take 5–8 s (chromium cold start). Subsequent emails are fast.
3. Check your inbox — the email should arrive with the invoice PDF attached and any extra files you picked.

## Troubleshooting

| Symptom                                                                | Likely cause                                                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `failed-precondition` from the function with "401" in the message       | API key isn't set or doesn't have Mail Send permission. Re-create the key with Mail Send + reset.    |
| Email never arrives, no error                                          | Recipient inbox spam folder, or the sender isn't verified. Re-check sender authentication.          |
| Function logs say "template id not found"                              | Wrong template ID copied, or the template is in a different SendGrid account.                       |
| Emails work but the PDF is blank / broken                              | Likely a font load issue. Check `functions/lib` was rebuilt after a template change (`npm run sync`).|
| `quotaExceeded` from SendGrid                                          | Free tier is ~100/day. Upgrade or wait until UTC midnight.                                          |
| Cold-start timeouts on first send                                      | The 120s function timeout is generous, but if you keep hitting it, raise the function memory in the `onCall` config in `functions/src/sendInvoiceEmail.ts`.|

## Privacy note

The SendGrid API key never leaves the Functions environment — it's never bundled into the client app, and the client only ever calls the callable. Your invoice data and the recipient's email address pass through SendGrid's logs (per their terms); attachments are forwarded to SendGrid in-memory by the function and discarded immediately afterward (per spec §11).
