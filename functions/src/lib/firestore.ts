import { adminDb } from "./admin";
import {
  ProfileSchema,
  SettingsSchema,
  InvoiceSchema,
  CreditNoteSchema,
  type Invoice,
  type Profile,
  type Settings,
  type CreditNote,
} from "./types";

const paths = {
  profile: (uid: string) => `users/${uid}/profile/main`,
  settings: (uid: string) => `users/${uid}/settings/main`,
  counters: (uid: string) => `users/${uid}/counters/main`,
  invoice: (uid: string, id: string) => `users/${uid}/invoices/${id}`,
  invoices: (uid: string) => `users/${uid}/invoices`,
  creditNote: (uid: string, id: string) => `users/${uid}/creditNotes/${id}`,
  creditNotes: (uid: string) => `users/${uid}/creditNotes`,
};

export { paths as fsPaths };

export async function fetchProfile(uid: string): Promise<Profile> {
  const snap = await adminDb().doc(paths.profile(uid)).get();
  if (!snap.exists) return ProfileSchema.parse({});
  const parsed = ProfileSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : ProfileSchema.parse({});
}

export async function fetchSettings(uid: string): Promise<Settings> {
  const snap = await adminDb().doc(paths.settings(uid)).get();
  if (!snap.exists) return SettingsSchema.parse({});
  const parsed = SettingsSchema.safeParse(snap.data());
  return parsed.success ? parsed.data : SettingsSchema.parse({});
}

export async function fetchInvoice(uid: string, invoiceId: string): Promise<Invoice | null> {
  const snap = await adminDb().doc(paths.invoice(uid, invoiceId)).get();
  if (!snap.exists) return null;
  const parsed = InvoiceSchema.safeParse({ id: snap.id, ...(snap.data() as object) });
  return parsed.success ? parsed.data : null;
}

export async function listInvoicesForUser(uid: string): Promise<Invoice[]> {
  const snap = await adminDb().collection(paths.invoices(uid)).orderBy("createdAt", "desc").get();
  const out: Invoice[] = [];
  for (const d of snap.docs) {
    const parsed = InvoiceSchema.safeParse({ id: d.id, ...d.data() });
    if (parsed.success && !parsed.data.deletedAt) out.push(parsed.data);
  }
  return out;
}

export async function listCreditNotesForUser(uid: string): Promise<CreditNote[]> {
  const snap = await adminDb().collection(paths.creditNotes(uid)).orderBy("createdAt", "desc").get();
  const out: CreditNote[] = [];
  for (const d of snap.docs) {
    const parsed = CreditNoteSchema.safeParse({ id: d.id, ...d.data() });
    if (parsed.success && !parsed.data.deletedAt) out.push(parsed.data);
  }
  return out;
}
