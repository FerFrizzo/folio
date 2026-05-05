# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Folio** is a single-user invoicing app for Australian small businesses. It targets iOS, Android, and Web from a single Expo codebase. Key features: ATO-compliant GST invoices, multi-currency, credit notes, payment tracking, and SendGrid email delivery with PDF attachments.

## Commands

```bash
# Development
npm start               # Expo dev server (pick platform via i/a/w)
npm run android         # Android dev build
npm run ios             # iOS dev build
npm run web             # Web dev server

# Code quality
npm run typecheck       # Strict TypeScript check
npm run lint            # ESLint (expo lint)
npm test                # Jest (root app)
npm run preflight       # All QA gates: tsc + lint + jest + functions build + expo doctor

# Cloud Functions
npm run functions:build # Compile TypeScript in functions/
npm run functions:test  # Jest for functions

# Assets
npm run icons           # Generate app icons from assets/source/icon.png (1024×1024 PNG required)
```

To run a single Jest test: `npx jest --testPathPattern=<filename>`

## Architecture

### App Shell

`app/_layout.tsx` is the root — it sets up Firebase Auth, TanStack Query, Toast, and the Router. All screens live under `app/` using Expo Router file-based routing. Tabs are in `app/(tabs)/`.

### Feature Organization

`src/features/` holds feature-scoped folders (auth, invoices, credit-notes, clients, settings, dashboard). Each feature owns its UI components and React Query hooks. Shared, pure logic (math, validation, PDF generation, Firestore wrappers) lives in `src/lib/`.

### Data Layer

- **Zod schemas** in `src/types/schemas.ts` are the single source of truth for all Firestore document shapes. Every Firestore read/write flows through these schemas.
- **Firestore wrappers** in `src/lib/firestore/` expose typed query/mutation functions consumed by TanStack Query hooks in each feature.
- **Single-user model**: one Firestore project per app install (anonymous auth, optionally linked to Apple/Google OAuth). No multi-tenancy.
- **Cloud Functions** in `functions/src/` are v2 callable functions (`sendInvoiceEmail`, `exportPdfsZip`). They share PDF template logic with the client via `functions/scripts/sync-templates.js`.

### State

- **TanStack Query v5**: all server/Firestore state
- **Zustand**: client-only state (invoice editor working copy)
- **React Hook Form + Zod**: form validation; schema inference gives end-to-end type safety

### Money Math

Always use `src/lib/money.ts` (Dinero.js wrapper). All monetary values are stored as integer cents. Never use floating-point arithmetic for currency.

### Styling

NativeWind v4 (Tailwind CSS). Design tokens are in `tailwind.config.js` (light/dark CSS variables). Global CSS is in `global.css`. The design system components live in `src/components/ui/`. Always use the token-based color names (e.g. `bg-surface`, `text-foreground`) rather than raw hex values.

## TypeScript

Strict mode with `noUncheckedIndexedAccess` and `noImplicitOverride`. Path aliases configured:
- `@/components` → `src/components/`
- `@/features` → `src/features/`
- `@/lib` → `src/lib/`
- `@/theme` → `src/theme/`
- `@/types` → `src/types/`

## Environment Variables

Copy `.env.example` to `.env` and fill in Firebase Web SDK config. All client vars are prefixed `EXPO_PUBLIC_FIREBASE_*` and bundled into the app. Cloud Functions read secrets separately — see `docs/SENDGRID.md`.

## Cloud Functions

Deployed to `australia-southeast1`. The PDF template code is **duplicated** between `src/lib/pdf/` (client preview) and `functions/src/lib/template-snapshot/` (server render). After editing templates, run `npm run functions:sync-templates` to keep them in sync before deploying.

## Build & Release

EAS profiles are in `eas.json` (development / preview / production). See `docs/RELEASING.md` for the full build-and-submit walkthrough and `docs/SUBMIT.md` for the Phase 6 store-submission checklist.

## Key Docs

- `docs/PROJECT_BRIEF.md` — full feature specification and phase breakdown
- `docs/AUTH_PROVIDERS.md` — Apple/Google OAuth setup
- `docs/SENDGRID.md` — SendGrid API key + domain config
- `docs/RELEASING.md` — EAS build and store submission steps
