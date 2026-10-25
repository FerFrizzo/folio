import { restoreWithFeedback } from "@/src/features/invoices/restoreWithFeedback";

const show = jest.fn();
const toast = { show };

beforeEach(() => {
  show.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("restoreWithFeedback", () => {
  it("restores and confirms", async () => {
    const restore = jest.fn().mockResolvedValue(undefined);
    await expect(restoreWithFeedback("CN-0002", restore, toast)).resolves.toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith({ message: "CN-0002 restored.", variant: "success" });
  });

  // Regression: a failed restore was an unhandled rejection with no feedback.
  it("shows an error and resolves false when the restore fails", async () => {
    const restore = jest.fn().mockRejectedValue(new Error("offline"));
    await expect(restoreWithFeedback("INV-0001", restore, toast)).resolves.toBe(false);
    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" }));
  });
});
