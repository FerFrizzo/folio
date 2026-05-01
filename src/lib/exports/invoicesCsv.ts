import type { CreditNote, Invoice } from "@/src/types/schemas";
import { formatMoney } from "@/src/lib/money";

// Two-file CSV export per spec §10:
//   invoices.csv     — one row per invoice with totals
//   lineItems.csv    — one row per line item, FK to invoice/CN number
// Both include credit notes (CN-prefixed).

function escapeCell(v: string | number | undefined | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(values: (string | number | undefined | null)[]): string {
  return values.map(escapeCell).join(",");
}

export function buildInvoicesCsv(
  invoices: Invoice[],
  creditNotes: CreditNote[],
): string {
  const header = row([
    "type",
    "number",
    "status",
    "currency",
    "issueDate",
    "dueDate",
    "clientName",
    "clientAbn",
    "subtotalCents",
    "lineDiscountTotalCents",
    "invoiceDiscountTotalCents",
    "gstTotalCents",
    "totalCents",
    "amountPaidCents",
    "balanceCents",
    "totalFormatted",
    "sentAt",
    "paidAt",
    "deletedAt",
  ]);

  const invoiceRows = invoices.map((inv) =>
    row([
      "invoice",
      inv.number,
      inv.status,
      inv.currency,
      inv.issueDate,
      inv.dueDate,
      inv.clientSnapshot.name,
      inv.clientSnapshot.abn ?? "",
      inv.subtotalCents,
      inv.lineDiscountTotalCents,
      inv.invoiceDiscountTotalCents,
      inv.gstTotalCents,
      inv.totalCents,
      inv.amountPaidCents,
      inv.balanceCents,
      formatMoney(inv.totalCents, inv.currency),
      inv.sentAt ?? "",
      inv.paidAt ?? "",
      inv.deletedAt ?? "",
    ]),
  );

  const cnRows = creditNotes.map((cn) =>
    row([
      "credit-note",
      cn.number,
      "issued",
      cn.currency,
      cn.issueDate,
      "",
      cn.clientSnapshot.name,
      cn.clientSnapshot.abn ?? "",
      cn.subtotalCents,
      0,
      0,
      cn.gstTotalCents,
      cn.totalCents,
      0,
      cn.totalCents,
      formatMoney(cn.totalCents, cn.currency),
      "",
      "",
      cn.deletedAt ?? "",
    ]),
  );

  return [header, ...invoiceRows, ...cnRows].join("\n");
}

export function buildLineItemsCsv(
  invoices: Invoice[],
  creditNotes: CreditNote[],
): string {
  const header = row([
    "documentType",
    "documentNumber",
    "currency",
    "description",
    "qty",
    "unit",
    "unitPriceCents",
    "lineDiscountAmountCents",
    "gstRate",
    "taxableCents",
    "gstAmountCents",
    "lineTotalCents",
  ]);

  const invoiceLines = invoices.flatMap((inv) =>
    inv.lineItems.map((l) =>
      row([
        "invoice",
        inv.number,
        inv.currency,
        l.description,
        l.qty,
        l.unit ?? "",
        l.unitPriceCents,
        l.lineDiscountAmountCents,
        l.gstRate,
        l.taxableCents,
        l.gstAmountCents,
        l.lineTotalCents,
      ]),
    ),
  );

  const cnLines = creditNotes.flatMap((cn) =>
    cn.lineItems.map((l) =>
      row([
        "credit-note",
        cn.number,
        cn.currency,
        l.description,
        l.qty,
        l.unit ?? "",
        l.unitPriceCents,
        0,
        l.gstRate,
        l.taxableCents,
        l.gstAmountCents,
        l.lineTotalCents,
      ]),
    ),
  );

  return [header, ...invoiceLines, ...cnLines].join("\n");
}
