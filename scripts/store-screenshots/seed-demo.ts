import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getFirestore, writeBatch } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { fsPaths } from "@/src/lib/firestore/paths";
import { CreditNoteSchema, InvoiceSchema } from "@/src/types/schemas";
import {
  DEMO_CLIENTS,
  DEMO_LIBRARY,
  DEMO_PROFILE,
  DEMO_SETTINGS,
  buildCreditNote,
  buildInvoices,
} from "./demo-data";

// Seeds the store-screenshot demo account in the live Firebase project.
// Idempotent: fixed document IDs, so re-running overwrites the same docs.
// Credentials are kept in secrets/demo-account.json (gitignored).
const CREDS_PATH = "secrets/demo-account.json";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const missing = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) throw new Error(`Missing Firebase config (${missing.join(", ")}) — run with --env-file=.env`);

const app = initializeApp(firebaseConfig);

async function signIn() {
  const auth = getAuth(app);
  if (existsSync(CREDS_PATH)) {
    const { email, password } = JSON.parse(readFileSync(CREDS_PATH, "utf8"));
    return (await signInWithEmailAndPassword(auth, email, password)).user.uid;
  }
  const email = "screenshots@folio-demo.invalid";
  const password = randomBytes(18).toString("base64url");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  writeFileSync(CREDS_PATH, JSON.stringify({ email, password, uid: cred.user.uid }, null, 2), { mode: 0o600 });
  return cred.user.uid;
}

async function uploadLogo(uid: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
    <rect width="500" height="500" rx="110" fill="#0F2A44"/>
    <path d="M285 70 L160 270 H245 L210 430 L345 215 H258 Z" fill="#F5B82E"/>
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const objectRef = ref(getStorage(app), `users/${uid}/logo.png`);
  await uploadBytes(objectRef, new Uint8Array(png), { contentType: "image/png" });
  return getDownloadURL(objectRef);
}

async function main() {
  const uid = await signIn();
  const db = getFirestore(app);
  const logoUrl = await uploadLogo(uid);
  const invoices = buildInvoices().map((i) => InvoiceSchema.parse(i));
  const creditNote = CreditNoteSchema.parse(buildCreditNote(invoices));
  const issued = invoices.filter((i) => i.status !== "draft").length;

  const batch = writeBatch(db);
  batch.set(doc(db, fsPaths.profile(uid)), { ...DEMO_PROFILE, logoUrl });
  batch.set(doc(db, fsPaths.settings(uid)), DEMO_SETTINGS);
  batch.set(doc(db, fsPaths.counters(uid)), { invoiceCounter: issued, creditNoteCounter: 1, year: 2026 });
  for (const c of DEMO_CLIENTS) {
    batch.set(doc(db, fsPaths.client(uid, c.id)), JSON.parse(JSON.stringify({ ...c, createdAt: "2026-07-01T09:00:00+10:00" })));
  }
  for (const e of DEMO_LIBRARY) {
    batch.set(doc(db, fsPaths.lineItemLibraryEntry(uid, e.id)), { ...e, createdAt: "2026-07-01T09:00:00+10:00" });
  }
  for (const { id, ...data } of invoices) {
    batch.set(doc(db, fsPaths.invoice(uid, id)), JSON.parse(JSON.stringify(data)));
  }
  const { id: cnId, ...cn } = creditNote;
  batch.set(doc(db, fsPaths.creditNote(uid, cnId)), JSON.parse(JSON.stringify(cn)));
  await batch.commit();

  console.log(`Seeded demo account: ${invoices.length} invoices, ${DEMO_CLIENTS.length} clients, 1 credit note.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
