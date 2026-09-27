const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
const mockRecordSent = jest.fn(async () => {});
jest.mock("@/src/features/review", () => ({
  recordInvoiceSent: () => mockRecordSent(),
}));
jest.mock("@/src/lib/firebase", () => ({ getFirebaseFunctions: () => ({}) }));
const mockCallable = jest.fn();
jest.mock("firebase/functions", () => ({
  httpsCallable: () => mockCallable,
}));
jest.mock("expo-file-system", () => ({ File: class {} }));

import { sendInvoiceEmail } from "@/src/features/invoices/sendEmail";

const input = { invoiceId: "inv-1", to: "a@b.co", subject: "s", body: "b", attachments: [] };

beforeEach(() => jest.clearAllMocks());

it("tracks an email invoice_sent after the callable resolves", async () => {
  mockCallable.mockResolvedValueOnce({ data: { ok: true } });
  await sendInvoiceEmail(input);
  expect(mockTrack).toHaveBeenCalledWith("invoice_sent", { channel: "email" });
  expect(mockRecordSent).toHaveBeenCalledTimes(1);
});

it("emits nothing when the callable fails", async () => {
  mockCallable.mockRejectedValueOnce(new Error("functions/unavailable"));
  await expect(sendInvoiceEmail(input)).rejects.toThrow("functions/unavailable");
  expect(mockTrack).not.toHaveBeenCalled();
  expect(mockRecordSent).not.toHaveBeenCalled();
});
