// Canonical Firestore document shapes — kept in sync with src/types/schemas.ts.
// This copy exists because the functions package cannot import from the root src/.

import { z } from "zod";

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const ISO_DATETIME = z.string().datetime({ offset: true }).or(z.string());
const NON_EMPTY = z.string().min(1, "Required");

export const CurrencyCodeSchema = z.enum(["AUD", "USD", "EUR", "GBP", "NZD"]);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const PaymentDetailsSchema = z.object({
  bsb: z.string().optional(),
  accName: z.string().optional(),
  accNumber: z.string().optional(),
  payId: z.string().optional(),
  otherNotes: z.string().optional(),
});
export type PaymentDetails = z.infer<typeof PaymentDetailsSchema>;

export const ProfileSchema = z.object({
  businessName: z.string().default(""),
  abn: z.string().default(""),
  address: z.string().default(""),
  email: z.string().email("Invalid email").or(z.literal("")).default(""),
  phone: z.string().default(""),
  logoUrl: z.string().url().optional(),
  gstRegistered: z.literal(true).default(true),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const NumberingSchema = z.object({
  mode: z.enum(["auto", "custom"]).default("auto"),
  prefix: z.string().default("INV-"),
  minDigits: z.number().int().min(3).max(6).default(4),
  counter: z.number().int().nonnegative().default(0),
  customFormat: z.string().optional(),
});
export type Numbering = z.infer<typeof NumberingSchema>;

export const EmailDefaultsSchema = z.object({
  subject: z.string().default(""),
  body: z.string().default(""),
});
export type EmailDefaults = z.infer<typeof EmailDefaultsSchema>;

export const SettingsSchema = z.object({
  numbering: NumberingSchema.default({
    mode: "auto",
    prefix: "INV-",
    minDigits: 4,
    counter: 0,
  }),
  lineItemMode: z.enum(["basic", "units"]).default("basic"),
  defaultGstRate: z.number().min(0).max(1).default(0.1),
  defaultPaymentTermsDays: z.number().int().nonnegative().default(14),
  defaultCurrency: CurrencyCodeSchema.default("AUD"),
  paymentDetails: PaymentDetailsSchema.default({}),
  emailDefaults: EmailDefaultsSchema.default({ subject: "", body: "" }),
  themeMode: z.enum(["system", "light", "dark"]).default("system"),
  biometricEnabled: z.boolean().default(false),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const ClientSnapshotSchema = z.object({
  name: NON_EMPTY,
  email: z.string().optional(),
  address: z.string().optional(),
  abn: z.string().optional(),
});
export type ClientSnapshot = z.infer<typeof ClientSnapshotSchema>;

export const DiscountSchema = z.object({
  type: z.enum(["pct", "fixed"]),
  value: z.number().int().nonnegative(),
});
export type Discount = z.infer<typeof DiscountSchema>;

export const LineItemSchema = z.object({
  description: z.string().default(""),
  qty: z.number().nonnegative().default(1),
  unit: z.string().optional(),
  unitPriceCents: z.number().int().nonnegative().default(0),
  gstRate: z.number().min(0).max(1).default(0.1),
  lineDiscount: DiscountSchema.optional(),
  lineDiscountAmountCents: z.number().int().nonnegative().default(0),
  taxableCents: z.number().int().nonnegative().default(0),
  gstAmountCents: z.number().int().nonnegative().default(0),
  lineTotalCents: z.number().int().nonnegative().default(0),
});
export type LineItem = z.infer<typeof LineItemSchema>;

export const InvoiceStatusSchema = z.enum(["draft", "sent", "partial", "paid"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const PaymentRecordSchema = z.object({
  date: ISO_DATE,
  amountCents: z.number().int().positive(),
  method: z.string().optional(),
  note: z.string().optional(),
});
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;

export const InvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: InvoiceStatusSchema,
  currency: CurrencyCodeSchema,
  clientId: z.string().nullable(),
  clientSnapshot: ClientSnapshotSchema,
  issueDate: ISO_DATE,
  dueDate: ISO_DATE,
  lineItems: z.array(LineItemSchema),
  invoiceDiscount: DiscountSchema.optional(),
  subtotalCents: z.number().int().nonnegative(),
  lineDiscountTotalCents: z.number().int().nonnegative().default(0),
  invoiceDiscountTotalCents: z.number().int().nonnegative().default(0),
  discountTotalCents: z.number().int().nonnegative().default(0),
  gstTotalCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  amountPaidCents: z.number().int().nonnegative().default(0),
  balanceCents: z.number().int(),
  payments: z.array(PaymentRecordSchema).default([]),
  notes: z.string().default(""),
  paymentInstructionsSnapshot: PaymentDetailsSchema.default({}),
  pdfUrl: z.string().url().optional(),
  sentAt: ISO_DATETIME.optional(),
  paidAt: ISO_DATETIME.optional(),
  creditNoteIds: z.array(z.string()).default([]),
  createdAt: ISO_DATETIME,
  updatedAt: ISO_DATETIME,
  deletedAt: ISO_DATETIME.optional(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const CounterDocSchema = z.object({
  invoiceCounter: z.number().int().nonnegative().default(0),
  creditNoteCounter: z.number().int().nonnegative().default(0),
  year: z.number().int().optional(),
});
export type CounterDoc = z.infer<typeof CounterDocSchema>;

export const CreditNoteLineItemSchema = z.object({
  description: z.string().default(""),
  qty: z.number().default(0),
  unit: z.string().optional(),
  unitPriceCents: z.number().int().default(0),
  gstRate: z.number().min(0).max(1).default(0.1),
  taxableCents: z.number().int().default(0),
  gstAmountCents: z.number().int().default(0),
  lineTotalCents: z.number().int().default(0),
});
export type CreditNoteLineItem = z.infer<typeof CreditNoteLineItemSchema>;

export const CreditNoteSchema = z.object({
  id: z.string(),
  number: z.string(),
  originalInvoiceId: z.string(),
  originalInvoiceNumber: z.string(),
  currency: CurrencyCodeSchema,
  clientSnapshot: ClientSnapshotSchema,
  issueDate: ISO_DATE,
  reason: z.string().default(""),
  lineItems: z.array(CreditNoteLineItemSchema),
  subtotalCents: z.number().int(),
  gstTotalCents: z.number().int(),
  totalCents: z.number().int(),
  pdfUrl: z.string().url().optional(),
  createdAt: ISO_DATETIME,
  updatedAt: ISO_DATETIME,
  deletedAt: ISO_DATETIME.optional(),
});
export type CreditNote = z.infer<typeof CreditNoteSchema>;

// ---------- subscription ----------
// Kept in sync with src/types/schemas.ts SubscriptionSchema.
export const SubscriptionStateSchema = z.enum([
  "free",
  "trial",
  "active",
  "grace",
  "lapsed",
]);
export type SubscriptionState = z.infer<typeof SubscriptionStateSchema>;

export const EntitlementSchema = z.enum(["free", "pro"]);
export type Entitlement = z.infer<typeof EntitlementSchema>;

export const SubscriptionSchema = z.object({
  entitlement: EntitlementSchema,
  state: SubscriptionStateSchema,
  productId: z.string().optional(),
  currentPeriodEndsAt: ISO_DATETIME.optional(),
  gracePeriodEndsAt: ISO_DATETIME.optional(),
  rcUserId: z.string().optional(),
  updatedAt: ISO_DATETIME,
});
export type Subscription = z.infer<typeof SubscriptionSchema>;
