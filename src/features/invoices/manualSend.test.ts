const mockRecordSent = jest.fn(async () => {});
jest.mock("@/src/features/review", () => ({
  recordInvoiceSent: () => mockRecordSent(),
}));

import { completeManualSend } from "@/src/features/invoices/manualSend";

beforeEach(() => jest.clearAllMocks());

function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("completeManualSend", () => {
  it("counts the send for the review prompt only after the share resolves", async () => {
    const share = deferred();
    const onShared = jest.fn();
    const done = completeManualSend({ share: () => share.promise, onShared });

    // Share sheet still open: nothing counted or navigated yet.
    await Promise.resolve();
    expect(mockRecordSent).not.toHaveBeenCalled();
    expect(onShared).not.toHaveBeenCalled();

    share.resolve();
    await done;
    expect(mockRecordSent).toHaveBeenCalledTimes(1);
    expect(onShared).toHaveBeenCalledTimes(1);
  });

  it("records the send before running the success handler", async () => {
    const onShared = jest.fn();
    await completeManualSend({ share: async () => {}, onShared });
    expect(mockRecordSent.mock.invocationCallOrder[0]).toBeLessThan(
      onShared.mock.invocationCallOrder[0] as number,
    );
  });

  it("does not wait for the review prompt before finishing", async () => {
    mockRecordSent.mockImplementationOnce(() => new Promise<void>(() => {}));
    const onShared = jest.fn();
    await completeManualSend({ share: async () => {}, onShared });
    expect(onShared).toHaveBeenCalledTimes(1);
  });

  it("counts nothing and rethrows when the share fails", async () => {
    const onShared = jest.fn();
    await expect(
      completeManualSend({
        share: async () => {
          throw new Error("share failed");
        },
        onShared,
      }),
    ).rejects.toThrow("share failed");
    expect(mockRecordSent).not.toHaveBeenCalled();
    expect(onShared).not.toHaveBeenCalled();
  });
});
