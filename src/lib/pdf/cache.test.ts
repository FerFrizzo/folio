import {
  contentHashOf,
  getCachedPdfUrl,
  pdfStoragePath,
} from "@/src/lib/pdf/cache";
import type { Invoice } from "@/src/types/schemas";

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn(async (_alg: string, str: string) => {
    // Deterministic stub — first 8 chars of the input padded.
    return (str.slice(0, 8) + "-hash").padStart(64, "0");
  }),
}));

const baseInvoice: Invoice = {
  id: "inv_1",
  number: "INV-0001",
  status: "sent",
  currency: "AUD",
  clientId: null,
  clientSnapshot: { name: "Acme" },
  issueDate: "2026-05-01",
  dueDate: "2026-05-15",
  lineItems: [],
  subtotalCents: 0,
  lineDiscountTotalCents: 0,
  invoiceDiscountTotalCents: 0,
  discountTotalCents: 0,
  gstTotalCents: 0,
  totalCents: 0,
  amountPaidCents: 0,
  balanceCents: 0,
  payments: [],
  notes: "",
  paymentInstructionsSnapshot: {},
  creditNoteIds: [],
  createdAt: "2026-05-01T00:00:00Z",
  updatedAt: "2026-05-01T00:00:00Z",
};

describe("contentHashOf", () => {
  it("returns the SHA-256 of the html (mocked)", async () => {
    const hash = await contentHashOf("<html>x</html>");
    expect(hash).toMatch(/-hash$/);
  });
});

describe("pdfStoragePath", () => {
  it("formats the canonical path", () => {
    expect(pdfStoragePath("uid1", "inv1", "abc")).toBe(
      "users/uid1/invoices/inv1-abc.pdf",
    );
  });
});

describe("getCachedPdfUrl", () => {
  it("returns null when no pdfUrl", () => {
    expect(getCachedPdfUrl(baseInvoice)).toBeNull();
  });
  it("returns the URL when present", () => {
    expect(
      getCachedPdfUrl({ ...baseInvoice, pdfUrl: "https://example/x.pdf" }),
    ).toBe("https://example/x.pdf");
  });
});
