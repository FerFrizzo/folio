// TypeScript shapes for the invoice domain. These mirror the Firestore data
// model in spec §4 — kept loose for Phase 1 (mocked data only); real Zod
// schemas + transactional writes land in Phase 2.

export type InvoiceStatus = "draft" | "sent" | "partial" | "paid";

export type CurrencyCode = "AUD" | "USD" | "EUR" | "GBP" | "NZD";

export type LineItem = {
  description: string;
  qty: number;
  unit?: string;
  unitPriceCents: number;
  gstRate: number;
  gstAmountCents: number;
  lineTotalCents: number;
};

export type ClientSnapshot = {
  name: string;
  email?: string;
  address?: string;
  abn?: string;
};

export type Invoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  currency: CurrencyCode;
  clientId: string;
  clientSnapshot: ClientSnapshot;
  issueDate: string; // ISO YYYY-MM-DD
  dueDate: string;   // ISO YYYY-MM-DD
  lineItems: LineItem[];
  subtotalCents: number;
  discountTotalCents: number;
  gstTotalCents: number;
  totalCents: number;
  amountPaidCents: number;
  balanceCents: number;
  notes?: string;
  sentAt?: string;
  paidAt?: string;
  creditNoteIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

// Display-only enrichment derived at render time. "Overdue" is not persisted
// per spec §6 — it's derived from dueDate < today AND status in {sent, partial}.
export type InvoiceDisplayStatus = InvoiceStatus | "overdue";

export function deriveDisplayStatus(invoice: Invoice, today = new Date()): InvoiceDisplayStatus {
  if (invoice.status === "paid" || invoice.status === "draft") return invoice.status;
  const due = new Date(invoice.dueDate);
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (due < todayMid) return "overdue";
  return invoice.status;
}
