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

// Display status is just the invoice's real status — there is no due-date-
// derived "overdue" bucket now that Due Date has been removed.
export function deriveDisplayStatus(
  invoice: Invoice,
  _today: Date = new Date(),
): InvoiceDisplayStatus {
  return invoice.status;
}

// Status counts derived from a list — for KPI cards and badges.
export function summarizeStatuses(invoices: Invoice[], today: Date = new Date()) {
  let draft = 0;
  let sent = 0;
  let partial = 0;
  let paid = 0;
  for (const inv of invoices) {
    if (inv.deletedAt) continue;
    const display = deriveDisplayStatus(inv, today);
    switch (display) {
      case "draft": draft++; break;
      case "sent": sent++; break;
      case "partial": partial++; break;
      case "paid": paid++; break;
    }
  }
  return { draft, sent, partial, paid };
}
