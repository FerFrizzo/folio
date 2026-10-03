import { enrichLine, computeInvoiceTotals, type LineInput } from "@/src/lib/invoice-totals";
import type {
  Client,
  CreditNote,
  Invoice,
  LineItemLibraryEntry,
  PaymentDetails,
  Profile,
  Settings,
} from "@/src/types/schemas";

// Fictional business for store screenshots. The ABN passes the mod-89 checksum
// and the phone is in ACMA's reserved-for-fiction range (0491 570 xxx).
export const DEMO_PAYMENT: PaymentDetails = {
  accName: "Coastline Electrical",
  bsb: "062-000",
  accNumber: "1234 5678",
  payId: "0491 570 156",
};

export const DEMO_PROFILE: Profile = {
  businessName: "Coastline Electrical",
  abn: "49624595711",
  address: "4/18 Marine Pde, Wollongong NSW 2500",
  email: "jobs@coastlineelectrical.com.au",
  phone: "0491 570 156",
  gstRegistered: true,
};

export const DEMO_SETTINGS: Settings = {
  numbering: { mode: "auto", prefix: "INV-", minDigits: 4, counter: 0, allowManualNumber: false },
  lineItemMode: "units",
  defaultGstRate: 0.1,
  defaultPaymentTermsDays: 14,
  defaultCurrency: "AUD",
  paymentDetails: DEMO_PAYMENT,
  emailDefaults: {
    subject: "Invoice {{number}} from {{businessName}}",
    body: "Hi {{clientName}},\n\nThanks for having us out. Your invoice is attached — payment details are on the PDF.\n\nCheers,\nCoastline Electrical",
  },
  themeMode: "light",
  biometricEnabled: false,
};

type ClientSeed = Omit<Client, "createdAt">;

export const DEMO_CLIENTS: ClientSeed[] = [
  { id: "harbourside", name: "Harbourside Café", email: "accounts@harboursidecafe.com.au", address: "2 Cliff Rd, Wollongong NSW 2500", abn: "85661250090" },
  { id: "greenway", name: "Greenway Property Group", email: "ap@greenwayproperty.com.au", address: "Level 3, 55 Crown St, Wollongong NSW 2500", abn: "73569568058" },
  { id: "nguyen", name: "Sam & Priya Nguyen", email: "sam.nguyen@outlook.com", address: "17 Bellambi Ln, Corrimal NSW 2518" },
  { id: "northside", name: "Northside Physio", email: "admin@northsidephysio.com.au", address: "1/240 Princes Hwy, Fairy Meadow NSW 2519" },
  { id: "oakiron", name: "Oak & Iron Builders", email: "jobs@oakandiron.com.au", address: "9 Industrial Rd, Unanderra NSW 2526" },
  { id: "bayview", name: "Bayview Strata", email: "levies@bayviewstrata.com.au", address: "PO Box 412, Thirroul NSW 2515" },
];

const LIB = {
  callout: { description: "Call-out fee", qty: 1, unit: "ea", unitPriceCents: 9500, gstRate: 0.1 },
  labour: { description: "Labour", qty: 1, unit: "hr", unitPriceCents: 11000, gstRate: 0.1 },
  gpo: { description: "Double power point — supply & install", qty: 1, unit: "ea", unitPriceCents: 14500, gstRate: 0.1 },
  downlight: { description: "LED downlight — supply & install", qty: 1, unit: "ea", unitPriceCents: 6500, gstRate: 0.1 },
  smoke: { description: "Smoke alarm, 240V interconnected", qty: 1, unit: "ea", unitPriceCents: 18900, gstRate: 0.1 },
  switchboard: { description: "Switchboard upgrade", qty: 1, unit: "ea", unitPriceCents: 165000, gstRate: 0.1 },
  ev: { description: "EV charger install (7kW)", qty: 1, unit: "ea", unitPriceCents: 89000, gstRate: 0.1 },
} satisfies Record<string, LineInput>;

export const DEMO_LIBRARY: Omit<LineItemLibraryEntry, "createdAt">[] = Object.entries(LIB).map(
  ([id, l]) => ({ id, description: l.description, defaultQty: 1, unit: l.unit, unitPriceCents: l.unitPriceCents, gstRate: l.gstRate }),
);

const line = (k: keyof typeof LIB, qty: number) => enrichLine({ ...LIB[k], qty });

type InvoiceSeed = {
  id: string;
  clientId: string;
  issueDate: string;
  lines: ReturnType<typeof line>[];
  // undefined = draft; otherwise the payments recorded against the sent invoice.
  payments?: { date: string; fraction: number }[];
  notes?: string;
};

const SEEDS: InvoiceSeed[] = [
  { id: "inv01", clientId: "harbourside", issueDate: "2026-07-08", lines: [line("callout", 1), line("labour", 2), line("gpo", 3)], payments: [{ date: "2026-07-15", fraction: 1 }] },
  { id: "inv02", clientId: "greenway", issueDate: "2026-07-21", lines: [line("smoke", 6), line("labour", 3)], payments: [{ date: "2026-08-02", fraction: 1 }] },
  { id: "inv03", clientId: "nguyen", issueDate: "2026-08-04", lines: [line("switchboard", 1), line("labour", 2)], payments: [{ date: "2026-08-11", fraction: 1 }] },
  { id: "inv04", clientId: "northside", issueDate: "2026-08-19", lines: [line("downlight", 12), line("labour", 4)], payments: [{ date: "2026-08-29", fraction: 1 }] },
  { id: "inv05", clientId: "oakiron", issueDate: "2026-09-02", lines: [line("gpo", 10), line("downlight", 18), line("labour", 9)], payments: [{ date: "2026-09-12", fraction: 1 }] },
  { id: "inv06", clientId: "bayview", issueDate: "2026-09-10", lines: [line("callout", 1), line("smoke", 4), line("labour", 2)], payments: [] },
  { id: "inv07", clientId: "greenway", issueDate: "2026-09-18", lines: [line("ev", 1), line("labour", 3)], payments: [{ date: "2026-09-30", fraction: 0.5 }] },
  { id: "inv08", clientId: "harbourside", issueDate: "2026-09-26", lines: [line("downlight", 6), line("labour", 2)], payments: [] },
  { id: "inv09", clientId: "oakiron", issueDate: "2026-10-01", lines: [line("gpo", 6), line("labour", 3)], payments: [{ date: "2026-10-02", fraction: 1 }] },
  {
    id: "inv10",
    clientId: "nguyen",
    issueDate: "2026-10-02",
    lines: [line("callout", 1), line("labour", 3.5), line("gpo", 4), line("downlight", 8)],
    payments: [],
    notes: "Thanks for choosing Coastline Electrical. Certificate of compliance emailed separately.",
  },
  { id: "draft01", clientId: "northside", issueDate: "2026-10-03", lines: [line("callout", 1), line("labour", 2), line("downlight", 4), line("smoke", 2)] },
];

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const at = (iso: string, hhmm = "09:00") => `${iso}T${hhmm}:00+10:00`;

export function buildInvoices(): Invoice[] {
  let seq = 0;
  return SEEDS.map((s) => {
    const client = DEMO_CLIENTS.find((c) => c.id === s.clientId);
    if (!client) throw new Error(`Unknown client ${s.clientId}`);
    const totals = computeInvoiceTotals(s.lines);
    const isDraft = s.payments === undefined;
    const payments = (s.payments ?? []).map((p) => ({
      date: p.date,
      amountCents: Math.round(totals.totalCents * p.fraction),
      method: "Bank transfer",
    }));
    const paid = payments.reduce((a, p) => a + p.amountCents, 0);
    const status: Invoice["status"] = isDraft ? "draft" : paid === 0 ? "sent" : paid >= totals.totalCents ? "paid" : "partial";
    const lastPayment = payments.at(-1);
    return {
      id: s.id,
      number: isDraft ? "DRAFT" : `INV-${String(++seq).padStart(4, "0")}`,
      status,
      currency: "AUD",
      clientId: client.id,
      clientSnapshot: { name: client.name, email: client.email, address: client.address, ...(client.abn ? { abn: client.abn } : {}) },
      issueDate: s.issueDate,
      dueDate: addDays(s.issueDate, 14),
      lineItems: s.lines,
      subtotalCents: totals.subtotalCents,
      lineDiscountTotalCents: 0,
      invoiceDiscountTotalCents: 0,
      discountTotalCents: 0,
      gstTotalCents: totals.gstTotalCents,
      totalCents: totals.totalCents,
      amountPaidCents: paid,
      balanceCents: totals.totalCents - paid,
      payments,
      notes: s.notes ?? "",
      paymentInstructionsSnapshot: DEMO_PAYMENT,
      ...(isDraft ? {} : { sentAt: at(s.issueDate) }),
      ...(status === "paid" && lastPayment ? { paidAt: at(lastPayment.date, "14:30") } : {}),
      creditNoteIds: s.id === "inv06" ? ["cn01"] : [],
      createdAt: at(s.issueDate, "08:30"),
      updatedAt: at(lastPayment?.date ?? s.issueDate, "14:30"),
    };
  });
}

export function buildCreditNote(invoices: Invoice[]): CreditNote {
  const original = invoices.find((i) => i.id === "inv06");
  if (!original) throw new Error("inv06 missing");
  const smoke = enrichLine({ ...LIB.smoke, qty: 1 });
  const negated = {
    description: smoke.description,
    qty: -1,
    unit: smoke.unit,
    unitPriceCents: smoke.unitPriceCents,
    gstRate: smoke.gstRate,
    taxableCents: -smoke.taxableCents,
    gstAmountCents: -smoke.gstAmountCents,
    lineTotalCents: -smoke.lineTotalCents,
  };
  return {
    id: "cn01",
    number: "CN-0001",
    originalInvoiceId: original.id,
    originalInvoiceNumber: original.number,
    currency: "AUD",
    clientSnapshot: original.clientSnapshot,
    issueDate: "2026-09-16",
    reason: "One smoke alarm not installed — no access to unit 3.",
    lineItems: [negated],
    subtotalCents: negated.taxableCents,
    gstTotalCents: negated.gstAmountCents,
    totalCents: negated.lineTotalCents,
    createdAt: at("2026-09-16", "10:00"),
    updatedAt: at("2026-09-16", "10:00"),
  };
}
