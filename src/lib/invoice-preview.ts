// Builds the Invoice object the editor's in-flight state represents. Shared by
// Save & Send (which renders the PDF it shares) and Preview, so what the user
// previews cannot drift from what actually gets sent.
import type {
  ClientSnapshot,
  CurrencyCode,
  Discount,
  Invoice,
  InvoiceStatus,
  LineItem,
  PaymentDetails,
} from "@/src/types/schemas";

export type EditorInvoiceInput = {
  id: string;
  number: string;
  status: InvoiceStatus;
  currency: CurrencyCode;
  clientId: string | null;
  clientSnapshot: ClientSnapshot;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  invoiceDiscount?: Discount | undefined;
  totals: {
    subtotalCents: number;
    lineDiscountTotalCents: number;
    invoiceDiscountTotalCents: number;
    discountTotalCents: number;
    gstTotalCents: number;
    totalCents: number;
  };
  notes: string;
  paymentInstructionsSnapshot: PaymentDetails;
  // Carried over when editing an existing invoice; the caller supplies "now"
  // rather than the module reading the clock, so this stays pure and testable.
  createdAt: string;
  updatedAt: string;
  sentAt?: string | undefined;
};

export function invoiceFromEditorState(input: EditorInvoiceInput): Invoice {
  return {
    id: input.id,
    number: input.number,
    status: input.status,
    currency: input.currency,
    clientId: input.clientId,
    clientSnapshot: input.clientSnapshot,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    lineItems: input.lineItems,
    ...(input.invoiceDiscount ? { invoiceDiscount: input.invoiceDiscount } : {}),
    subtotalCents: input.totals.subtotalCents,
    lineDiscountTotalCents: input.totals.lineDiscountTotalCents,
    invoiceDiscountTotalCents: input.totals.invoiceDiscountTotalCents,
    discountTotalCents: input.totals.discountTotalCents,
    gstTotalCents: input.totals.gstTotalCents,
    totalCents: input.totals.totalCents,
    amountPaidCents: 0,
    balanceCents: input.totals.totalCents,
    payments: [],
    notes: input.notes,
    paymentInstructionsSnapshot: input.paymentInstructionsSnapshot,
    creditNoteIds: [],
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    ...(input.sentAt ? { sentAt: input.sentAt } : {}),
  };
}
