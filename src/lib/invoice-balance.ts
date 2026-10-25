import type { CreditNote, Invoice } from "@/src/types/schemas";

type BalanceInvoice = Pick<
  Invoice,
  "id" | "status" | "totalCents" | "amountPaidCents" | "deletedAt"
>;

type BalanceCredit = Pick<CreditNote, "originalInvoiceId" | "totalCents" | "deletedAt">;

// Credit note totals are stored negative, so adding them reduces what is owed.
// An archived invoice contributes nothing. An archived credit note is skipped,
// which brings a fully cancelled invoice back to zero once the duplicate is archived.
export function netBalanceCents(
  invoice: Pick<Invoice, "totalCents" | "amountPaidCents" | "deletedAt">,
  creditNotes: Pick<CreditNote, "totalCents" | "deletedAt">[],
): number {
  if (invoice.deletedAt) return 0;
  const credit = creditNotes.reduce(
    (sum, cn) => (cn.deletedAt ? sum : sum + cn.totalCents),
    0,
  );
  return invoice.totalCents - invoice.amountPaidCents + credit;
}

export function outstandingCents(
  invoices: BalanceInvoice[],
  creditNotes: BalanceCredit[],
): number {
  const creditByInvoice = new Map<string, number>();
  for (const cn of creditNotes) {
    if (cn.deletedAt) continue;
    creditByInvoice.set(
      cn.originalInvoiceId,
      (creditByInvoice.get(cn.originalInvoiceId) ?? 0) + cn.totalCents,
    );
  }
  let total = 0;
  for (const inv of invoices) {
    if (inv.deletedAt) continue;
    if (inv.status !== "sent" && inv.status !== "partial") continue;
    total +=
      inv.totalCents -
      inv.amountPaidCents +
      (creditByInvoice.get(inv.id) ?? 0);
  }
  return total;
}
