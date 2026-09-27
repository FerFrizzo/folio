import { type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
const mockRecordSent = jest.fn(async () => {});
const mockRecordPaid = jest.fn(async () => {});
jest.mock("@/src/features/review", () => ({
  recordInvoiceSent: () => mockRecordSent(),
  recordInvoicePaid: () => mockRecordPaid(),
}));
jest.mock("@/src/features/auth/AuthProvider", () => ({
  useAuth: () => ({ status: "ready", user: { uid: "uid-1" } }),
}));

const mockCreateDraft = jest.fn();
const mockMarkSent = jest.fn();
const mockRecordPayment = jest.fn();
jest.mock("@/src/lib/firestore/invoices", () => ({
  createDraft: (...a: unknown[]) => mockCreateDraft(...a),
  markSent: (...a: unknown[]) => mockMarkSent(...a),
  recordPayment: (...a: unknown[]) => mockRecordPayment(...a),
}));

import { useCreateDraft, useMarkSent, useRecordPayment } from "@/src/features/invoices/queries";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => jest.clearAllMocks());

describe("invoice mutation events", () => {
  it("tracks invoice_drafted after a successful draft", async () => {
    mockCreateDraft.mockResolvedValueOnce({ id: "inv-1" });
    const { result } = renderHook(() => useCreateDraft(), { wrapper });
    await act(() => result.current.mutateAsync({} as never));
    expect(mockTrack).toHaveBeenCalledWith("invoice_drafted");
  });

  it("tracks a manual invoice_sent and counts it for the review prompt", async () => {
    mockMarkSent.mockResolvedValueOnce({ number: "INV-0001" });
    const { result } = renderHook(() => useMarkSent(), { wrapper });
    await act(() => result.current.mutateAsync({ id: "inv-1" }));
    expect(mockTrack).toHaveBeenCalledWith("invoice_sent", { channel: "manual" });
    expect(mockRecordSent).toHaveBeenCalledTimes(1);
  });

  it("tracks a partial payment without the paid trigger", async () => {
    mockRecordPayment.mockResolvedValueOnce({ status: "partial" });
    const { result } = renderHook(() => useRecordPayment(), { wrapper });
    await act(() => result.current.mutateAsync({ id: "inv-1", payment: {} as never }));
    expect(mockTrack).toHaveBeenCalledWith("payment_recorded", { fully_paid: false });
    expect(mockRecordPaid).not.toHaveBeenCalled();
  });

  it("tracks a full payment and fires the paid trigger", async () => {
    mockRecordPayment.mockResolvedValueOnce({ status: "paid" });
    const { result } = renderHook(() => useRecordPayment(), { wrapper });
    await act(() => result.current.mutateAsync({ id: "inv-1", payment: {} as never }));
    expect(mockTrack).toHaveBeenCalledWith("payment_recorded", { fully_paid: true });
    expect(mockRecordPaid).toHaveBeenCalledTimes(1);
  });

  // Review Focus #4
  it("emits nothing when the write fails", async () => {
    mockMarkSent.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useMarkSent(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ id: "inv-1" })).rejects.toThrow("offline");
    });
    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockRecordSent).not.toHaveBeenCalled();
  });
});
