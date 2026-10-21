import { act, renderHook } from "@testing-library/react-native";
import { useIssueCreditNote } from "@/src/features/credit-notes/useIssueCreditNote";
import type { CreditNote } from "@/src/types/schemas";

const cn = { id: "cn1", number: "CN-0001" } as CreditNote;

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("useIssueCreditNote", () => {
  it("creates then shares, reporting issued", async () => {
    const create = jest.fn().mockResolvedValue(cn);
    const share = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useIssueCreditNote());

    let outcome;
    await act(async () => {
      outcome = await result.current.issue({ create, share });
    });

    expect(outcome).toEqual({ status: "issued", creditNote: cn });
    expect(share).toHaveBeenCalledWith(cn);
    expect(result.current.submitting).toBe(false);
  });

  // Regression: a double tap used to issue two credit notes because the
  // disabled state only applied after a re-render.
  it("rejects a second issue while the first is in flight", async () => {
    const pending = deferred<CreditNote>();
    const create = jest.fn().mockReturnValue(pending.promise);
    const share = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useIssueCreditNote());

    let first: Promise<unknown> = Promise.resolve();
    let second: unknown;
    await act(async () => {
      first = result.current.issue({ create, share });
      second = await result.current.issue({ create, share });
    });
    expect(second).toEqual({ status: "busy" });
    expect(result.current.submitting).toBe(true);

    await act(async () => {
      pending.resolve(cn);
      await first;
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(result.current.submitting).toBe(false);
  });

  // Regression: a PDF/share failure after the credit note was saved used to
  // surface as "Couldn't issue." and keep the editor open, so a retry issued a
  // duplicate.
  it("reports issued-share-failed when sharing throws after the save", async () => {
    const error = new Error("Sharing is not available on this device.");
    const create = jest.fn().mockResolvedValue(cn);
    const share = jest.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useIssueCreditNote());

    let outcome;
    await act(async () => {
      outcome = await result.current.issue({ create, share });
    });

    expect(outcome).toEqual({ status: "issued-share-failed", creditNote: cn, error });
  });

  it("reports failed and skips sharing when the save throws", async () => {
    const error = new Error("offline");
    const create = jest.fn().mockRejectedValue(error);
    const share = jest.fn();
    const { result } = renderHook(() => useIssueCreditNote());

    let outcome;
    await act(async () => {
      outcome = await result.current.issue({ create, share });
    });

    expect(outcome).toEqual({ status: "failed", error });
    expect(share).not.toHaveBeenCalled();
    expect(result.current.submitting).toBe(false);
  });

  it("allows a new issue after a failure", async () => {
    const create = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(cn);
    const share = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useIssueCreditNote());

    await act(async () => {
      await result.current.issue({ create, share });
    });
    let outcome;
    await act(async () => {
      outcome = await result.current.issue({ create, share });
    });

    expect(outcome).toEqual({ status: "issued", creditNote: cn });
    expect(create).toHaveBeenCalledTimes(2);
  });
});
