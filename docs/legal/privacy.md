---
title: Privacy policy
permalink: /privacy/
layout: default
---

# Privacy policy

*Last updated: 2026-05-02*

Folio is a single-user invoicing app for Australian small business. This
policy describes what data Folio collects, how we use it, and your rights.

If anything is unclear, email us at the address listed in
[`docs/legal/terms.md`](./terms.md).

## TL;DR

- We don't collect telemetry, analytics, or crash reports.
- The only data Folio stores is the data you create — your business
  profile, clients, invoices, payments, credit notes, and line item
  library — held in your own Firebase project's Firestore database.
- When you send an invoice email, the recipient address and the email
  contents pass through SendGrid (our email service provider) so they
  can be delivered. SendGrid does not retain attachments after delivery.
- We don't sell, share, or otherwise disclose your data to third parties.

## What we collect

### Data you provide

When you use Folio, you can enter:

- Business profile (business name, ABN, address, email, phone, logo)
- Client records (name, email, address, ABN)
- Invoices and credit notes (line items, totals, payment records, notes)
- Settings (numbering preferences, payment details, line item library,
  email defaults)
- A PIN (stored only as a salted SHA-256 hash; the original PIN is never
  stored anywhere)

This data is held in your own Firebase project — not on Folio's servers.

### Data we don't collect

- We do not run analytics, telemetry, or crash reporting.
- We do not include third-party tracking SDKs.
- We do not use App Tracking Transparency (no IDFA / advertising ID).
- We do not collect device identifiers, location, contacts, calendar,
  or any system-level data beyond what you actively grant.

## Permissions Folio requests

- **Photo library** — only when you upload a logo. We resize the chosen
  image to 500 px wide and store it in your Firebase Storage subtree.
- **Biometric** — only if you enable the optional PIN/biometric gate. The
  biometric prompt is handled entirely by your device's OS; Folio does
  not see fingerprints or face data.

## Third-party processors

| Service              | What's sent                                                                | Why                                  |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| Google Firebase      | Everything stored in Folio (auth, Firestore, Storage, Functions)            | App backend                          |
| SendGrid (Twilio)     | Recipient email + invoice email body + PDF attachment, when you send mail   | Outbound email delivery              |
| Apple / Google OAuth | Email address + display name when you optionally link an account             | Sign-in identity                     |

We have no other third-party processors.

## Data location

Firebase services run in the region you configure in your Firebase
project. SendGrid processes email globally per their own privacy policy.

## Data retention

You control your data. Soft-deleted invoices and credit notes are kept
in Firestore until you remove them — Folio never auto-deletes data, and
the ATO requires Australian tax invoices to be retained for at least
five years after issue.

If you delete the app and your Firebase project, your data is gone.

## Your rights

- **Access:** all your data is visible inside the app at any time. The
  CSV / PDF ZIP exports give you offline copies on request.
- **Correction:** edit any field via the in-app screens.
- **Deletion:** soft-delete invoices/credit notes, hard-delete drafts.
  To delete everything, delete your Firebase project.

## Changes

Material changes to this policy will be reflected here with an updated
date at the top.
