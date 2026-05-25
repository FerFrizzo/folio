import type { Discount, Invoice, Profile, Settings } from "@/src/types/schemas";
import { formatMoney } from "@/src/lib/money";
import { formatAbn } from "@/src/lib/abn";

function formatDiscount(d: Discount, currency: Invoice["currency"]): string {
  if (d.type === "pct") return `${(d.value / 100).toFixed(2).replace(/\.00$/, "")}%`;
  return `−${formatMoney(d.value, currency)}`;
}

function uniqueGstRates(invoice: Invoice): number[] {
  const rates = new Set<number>();
  for (const l of invoice.lineItems) rates.add(l.gstRate);
  return Array.from(rates).sort((a, b) => a - b);
}

// Warm + professional invoice template for the Australian trades & services market.
// A4, cream header band, Fraunces serif display, Plus Jakarta Sans body,
// Folio blue (#1473FF) accent, blue grand-total box, blue-ruled payment block.

const ACCENT      = "#1473FF";
const NEAR_BLACK  = "#1C1917";
const STONE       = "#78716C";
const LIGHT_STONE = "#A8A29E";
const CREAM       = "#F2EFE9";
const LIGHT_BLUE  = "#EEF5FF";
const BORDER_WARM = "#E7E5E4";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export type RenderInvoiceArgs = {
  invoice: Invoice;
  profile: Profile;
  settings: Settings;
};

export function renderInvoiceHtml({
  invoice,
  profile,
  settings,
}: RenderInvoiceArgs): string {
  const isExport = invoice.currency !== "AUD";
  const businessName = escapeHtml(profile.businessName || "Your Business");
  const abn = profile.abn ? escapeHtml(formatAbn(profile.abn)) : "";
  const buyer = escapeHtml(invoice.clientSnapshot.name);
  const buyerAddress = invoice.clientSnapshot.address
    ? escapeHtml(invoice.clientSnapshot.address)
    : "";
  const buyerAbn = invoice.clientSnapshot.abn
    ? escapeHtml(formatAbn(invoice.clientSnapshot.abn))
    : "";

  const businessAddress = profile.address ? escapeHtml(profile.address) : "";
  const businessEmail   = profile.email   ? escapeHtml(profile.email)   : "";
  const businessPhone   = profile.phone   ? escapeHtml(profile.phone)   : "";

  const logoTag = profile.logoUrl
    ? `<img class="logo" src="${escapeHtml(profile.logoUrl)}" alt="${businessName} logo" />`
    : "";

  const businessMeta = [
    abn ? `ABN ${abn}` : "",
    businessAddress,
    businessEmail,
    businessPhone,
  ].filter(Boolean).join("\n");

  const rows = invoice.lineItems
    .map((line) => {
      const amount    = formatMoney(line.taxableCents, invoice.currency);
      const unitText  = line.unit ? ` ${escapeHtml(line.unit)}` : "";
      const discountTag =
        line.lineDiscount && line.lineDiscountAmountCents > 0
          ? `<div class="line-discount">Discount ${formatDiscount(line.lineDiscount, invoice.currency)} (−${formatMoney(line.lineDiscountAmountCents, invoice.currency)})</div>`
          : "";
      return `
      <tr>
        <td class="desc">${escapeHtml(line.description || "")}${discountTag}</td>
        <td class="num">${line.qty}${unitText}</td>
        <td class="num">${formatMoney(line.unitPriceCents, invoice.currency)}</td>
        <td class="num">${amount}</td>
      </tr>`;
    })
    .join("");

  // Totals block
  const rates             = uniqueGstRates(invoice);
  const isMixedRate       = !isExport && rates.length > 1;
  const taxableSubtotalCents = invoice.subtotalCents;
  const totalsRows: string[] = [];

  const grossSubtotalCents =
    taxableSubtotalCents +
    invoice.lineDiscountTotalCents +
    invoice.invoiceDiscountTotalCents;

  if (invoice.lineDiscountTotalCents > 0 || invoice.invoiceDiscountTotalCents > 0) {
    totalsRows.push(
      `<div class="row"><span class="label">Subtotal</span><span>${formatMoney(grossSubtotalCents, invoice.currency)}</span></div>`,
    );
    if (invoice.lineDiscountTotalCents > 0) {
      totalsRows.push(
        `<div class="row"><span class="label">Line discounts</span><span>−${formatMoney(invoice.lineDiscountTotalCents, invoice.currency)}</span></div>`,
      );
    }
    if (invoice.invoiceDiscountTotalCents > 0) {
      const tag = invoice.invoiceDiscount
        ? ` (${formatDiscount(invoice.invoiceDiscount, invoice.currency)})`
        : "";
      totalsRows.push(
        `<div class="row"><span class="label">Invoice discount${tag}</span><span>−${formatMoney(invoice.invoiceDiscountTotalCents, invoice.currency)}</span></div>`,
      );
    }
    totalsRows.push(
      `<div class="row"><span class="label">${isExport || isMixedRate ? "Subtotal (ex-GST)" : "Subtotal after discounts"}</span><span>${formatMoney(taxableSubtotalCents, invoice.currency)}</span></div>`,
    );
  } else {
    totalsRows.push(
      `<div class="row"><span class="label">${isExport || isMixedRate ? "Subtotal (ex-GST)" : "Subtotal"}</span><span>${formatMoney(taxableSubtotalCents, invoice.currency)}</span></div>`,
    );
  }

  if (!isExport) {
    if (isMixedRate) {
      let taxableAtRateCents = 0;
      let gstAtRateCents     = 0;
      for (const l of invoice.lineItems) {
        if (l.gstRate > 0) {
          taxableAtRateCents += l.taxableCents;
          gstAtRateCents     += l.gstAmountCents;
        }
      }
      totalsRows.push(
        `<div class="row mix"><span class="label">Includes ${formatMoney(gstAtRateCents, invoice.currency)} GST on ${formatMoney(taxableAtRateCents, invoice.currency)} of taxable items</span><span></span></div>`,
      );
    } else {
      totalsRows.push(
        `<div class="row"><span class="label">GST</span><span>${formatMoney(invoice.gstTotalCents, invoice.currency)}</span></div>`,
      );
    }
  }

  totalsRows.push(
    `<div class="row grand"><span class="grand-label">Total</span><span class="grand-amount">${formatMoney(invoice.totalCents, invoice.currency)}</span></div>`,
  );

  // Payment block
  const payment = settings.paymentDetails;
  const paymentRows: string[] = [];
  if (payment.bsb && payment.accNumber) {
    paymentRows.push(
      `<div><span class="label">BSB</span><span>${escapeHtml(payment.bsb)}</span></div>`,
      `<div><span class="label">Account</span><span>${escapeHtml(payment.accNumber)}</span></div>`,
    );
    if (payment.accName) {
      paymentRows.push(
        `<div><span class="label">Name</span><span>${escapeHtml(payment.accName)}</span></div>`,
      );
    }
  }
  if (payment.payId) {
    paymentRows.push(
      `<div><span class="label">PayID</span><span>${escapeHtml(payment.payId)}</span></div>`,
    );
  }
  if (payment.otherNotes) {
    paymentRows.push(
      `<div class="other"><span class="label">Other</span><span>${escapeHtml(payment.otherNotes)}</span></div>`,
    );
  }
  const paymentHtml = paymentRows.length
    ? `<section class="payment">
         <h2>Payment details</h2>
         ${paymentRows.join("")}
       </section>`
    : "";

  const exportNote = isExport
    ? `<p class="export-note">This invoice is treated as an export — no GST applies under Australian taxation law.</p>`
    : "";

  const gstFooterNote = profile.gstRegistered && !isExport
    ? "GST registered &nbsp;·&nbsp; ABN issued"
    : !profile.gstRegistered
      ? "Not registered for GST"
      : "";

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoice.number)} — Tax Invoice</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4; margin: 18mm 16mm 20mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Plus Jakarta Sans", -apple-system, "Helvetica Neue", sans-serif;
      font-size: 10pt;
      color: ${NEAR_BLACK};
      line-height: 1.5;
      background: #FDFCFB;
    }
    h2 {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${ACCENT};
      margin: 0 0 8px;
    }

    /* ── Header band ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 28px;
      background: ${CREAM};
      padding: 20px 22px 18px;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .header-rule {
      height: 3px;
      background: ${ACCENT};
      border-radius: 2px;
      margin-bottom: 22px;
    }
    .business { flex: 1; }
    .logo { max-height: 52px; max-width: 200px; object-fit: contain; display: block; margin-bottom: 10px; }
    .business-name {
      font-family: "Fraunces", Georgia, "Times New Roman", serif;
      font-size: 15pt;
      font-weight: 700;
      color: ${NEAR_BLACK};
      line-height: 1.2;
      margin-bottom: 7px;
    }
    .business-meta {
      font-size: 8.5pt;
      color: ${STONE};
      line-height: 1.7;
      white-space: pre-line;
    }
    .doc { text-align: right; flex-shrink: 0; }
    .doc-title {
      font-family: "Fraunces", Georgia, "Times New Roman", serif;
      font-size: 22pt;
      font-weight: 700;
      color: ${ACCENT};
      letter-spacing: -0.02em;
      line-height: 1;
      margin-bottom: 12px;
    }
    .doc-number {
      font-size: 12pt;
      font-weight: 700;
      color: ${NEAR_BLACK};
      letter-spacing: 0.01em;
      margin-bottom: 9px;
    }
    /* ── Date cards ── */
    .date-cards {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 6px;
    }
    .date-card {
      text-align: center;
      padding: 7px 12px;
      background: #FFFFFF;
      border-radius: 7px;
      border: 1pt solid ${BORDER_WARM};
      min-width: 62pt;
    }
    .dc-lbl {
      font-size: 6.5pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${LIGHT_STONE};
      margin-bottom: 2px;
    }
    .dc-val {
      font-size: 9pt;
      font-weight: 600;
      color: ${NEAR_BLACK};
    }
    .date-card.due {
      background: ${LIGHT_BLUE};
      border-color: ${ACCENT};
    }
    .date-card.due .dc-lbl { color: ${ACCENT}; }
    .date-card.due .dc-val { color: ${ACCENT}; }

    /* ── Bill to ── */
    .bill-to { margin-bottom: 22px; }
    .party-name { font-weight: 600; font-size: 11pt; color: ${NEAR_BLACK}; margin-bottom: 3px; }
    .party-meta { font-size: 8.5pt; color: ${STONE}; line-height: 1.55; white-space: pre-line; }

    /* ── Items table ── */
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-feature-settings: "tnum";
    }
    table.items thead th {
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${STONE};
      background: ${CREAM};
      padding: 8px 10px;
      text-align: left;
    }
    table.items thead th:first-child { border-radius: 5px 0 0 5px; }
    table.items thead th:last-child  { border-radius: 0 5px 5px 0; }
    table.items tbody td {
      padding: 11px 10px;
      border-bottom: 1pt solid #EDE9E3;
      vertical-align: top;
      font-size: 10pt;
    }
    table.items tbody tr:nth-child(even) td { background: #FAF8F5; }
    table.items tbody tr:last-child td { border-bottom: none; }
    .num { text-align: right; white-space: nowrap; }
    .desc { width: 55%; }
    .line-discount { font-size: 8.5pt; color: ${LIGHT_STONE}; margin-top: 3px; }

    /* ── Totals ── */
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals {
      width: 44%;
      background: #FAF7F3;
      border-radius: 8px;
      overflow: hidden;
      border: 1pt solid ${BORDER_WARM};
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      padding: 7px 14px;
      font-size: 9.5pt;
      border-bottom: 1pt solid ${BORDER_WARM};
    }
    .totals .row:last-child { border-bottom: none; }
    .totals .label { color: ${STONE}; }
    .totals .row.mix .label { font-size: 8.5pt; font-style: italic; }
    .totals .row.grand {
      background: ${ACCENT};
      padding: 12px 14px;
      align-items: flex-end;
      border-bottom: none;
    }
    .grand-label {
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.7);
      padding-bottom: 2pt;
    }
    .grand-amount {
      font-family: "Fraunces", Georgia, serif;
      font-size: 18pt;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    /* ── Payment ── */
    .payment {
      background: ${LIGHT_BLUE};
      border-left: 3pt solid ${ACCENT};
      border-radius: 0 8px 8px 0;
      padding: 14px 16px;
      margin-top: 16px;
    }
    .payment > div {
      display: flex;
      gap: 12px;
      padding: 3px 0;
      font-size: 9.5pt;
      align-items: baseline;
    }
    .payment .label { color: ${STONE}; min-width: 60px; font-size: 9pt; }
    .payment .other { align-items: flex-start; white-space: pre-line; }

    /* ── Notes ── */
    .notes {
      margin-top: 14px;
      padding: 12px 14px;
      background: #FAF9F7;
      border-left: 3pt solid ${BORDER_WARM};
      border-radius: 0 6px 6px 0;
      font-size: 9.5pt;
      color: ${STONE};
      white-space: pre-line;
    }
    .notes h2 { color: ${LIGHT_STONE}; margin-bottom: 5px; }

    /* ── Export note ── */
    .export-note {
      margin: 12px 0 0;
      padding: 9px 14px;
      background: ${LIGHT_BLUE};
      border-left: 3pt solid ${ACCENT};
      border-radius: 0 6px 6px 0;
      color: ${NEAR_BLACK};
      font-size: 9pt;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 28pt;
      padding-top: 8pt;
      border-top: 1pt solid ${BORDER_WARM};
      text-align: center;
      font-size: 7.5pt;
      color: ${LIGHT_STONE};
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="business">
      ${logoTag}
      <div class="business-name">${businessName}</div>
      <div class="business-meta">${businessMeta}</div>
    </div>
    <div class="doc">
      <div class="doc-title">Tax Invoice</div>
      <div class="doc-number">${escapeHtml(invoice.number)}</div>
      <div class="date-cards">
        <div class="date-card">
          <div class="dc-lbl">Issued</div>
          <div class="dc-val">${fmtDate(invoice.issueDate)}</div>
        </div>
        <div class="date-card due">
          <div class="dc-lbl">Due</div>
          <div class="dc-val">${fmtDate(invoice.dueDate)}</div>
        </div>
      </div>
    </div>
  </header>

  <div class="header-rule"></div>

  <section class="bill-to">
    <h2>Bill to</h2>
    <div class="party-name">${buyer}</div>
    ${buyerAbn     ? `<div class="party-meta">ABN ${buyerAbn}</div>`  : ""}
    ${buyerAddress ? `<div class="party-meta">${buyerAddress}</div>`  : ""}
  </section>

  <table class="items">
    <thead>
      <tr>
        <th class="desc">Description</th>
        <th class="num">Qty</th>
        <th class="num">Unit price</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      ${totalsRows.join("\n      ")}
    </div>
  </div>

  ${exportNote}
  ${paymentHtml}

  ${invoice.notes
    ? `<section class="notes"><h2>Notes</h2>${escapeHtml(invoice.notes)}</section>`
    : ""}

  <div class="footer">${gstFooterNote}</div>
</body>
</html>`;
}
