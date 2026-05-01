import type {
  Invoice,
  InvoiceStatus,
  InvoiceDisplayStatus,
} from "@/src/types/schemas";

// Status machine for invoices, per spec §6.
// Phase 2 implements Draft → Sent + derived Overdue. Partial / Paid land in
// Phase 3 alongside payment tracking — the function shapes accommodate them
// already so the call sites are forward-compatible.

const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent"],
  sent: ["partial", "paid"],
  partial: ["paid"],
  paid: [],
};

export function canTransition(
  from: InvoiceStatus,
  to: InvoiceStatus,
): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

// An invoice is mutable iff its status is Draft. Sent+ invoices may only be
// mutated via payment recording or credit-note linkage (Phase 3+). Soft-delete
// uses a separate `deletedAt` field and is not gated by isMutable.
export function isMutable(invoice: Invoice): boolean {
  return invoice.status === "draft";
}

// Overdue is derived, never persisted. An invoice is overdue when its due date
// is strictly before today (midnight) AND its status is sent or partial.
export function deriveDisplayStatus(
  invoice: Invoice,
  today: Date = new Date(),
): InvoiceDisplayStatus {
  if (invoice.status === "paid" || invoice.status === "draft") {
    return invoice.status;
  }
  const due = new Date(invoice.dueDate);
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return due < todayMid ? "overdue" : invoice.status;
}

// Status counts derived from a list — for KPI cards and badges.
export function summarizeStatuses(invoices: Invoice[], today: Date = new Date()) {
  let draft = 0;
  let sent = 0;
  let partial = 0;
  let paid = 0;
  let overdue = 0;
  for (const inv of invoices) {
    if (inv.deletedAt) continue;
    const display = deriveDisplayStatus(inv, today);
    switch (display) {
      case "draft": draft++; break;
      case "sent": sent++; break;
      case "partial": partial++; break;
      case "paid": paid++; break;
      case "overdue": overdue++; break;
    }
  }
  return { draft, sent, partial, paid, overdue };
}
