import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
import { sharePdf } from "@/src/lib/pdf/share";

// --- Mocks -----------------------------------------------------------------

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

// Minimal stand-in for the expo-file-system v19 File/Paths API. A File built
// from (cacheDir, name) exposes a deterministic uri so we can assert the shared
// path; copy() is a no-op that records it was called.
const mockFileCopy = jest.fn();
const mockFileDelete = jest.fn();
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  File: class {
    uri: string;
    exists = false;
    constructor(base: string, name?: string) {
      this.uri = name ? `${base}/${name}` : base;
    }
    delete() {
      mockFileDelete();
    }
    copy(dest: unknown) {
      mockFileCopy(dest);
    }
  },
}));

const shareAsyncMock = Sharing.shareAsync as jest.Mock;
const isAvailableMock = Sharing.isAvailableAsync as jest.Mock;

// Web-branch helpers.
function stubDom() {
  const click = jest.fn();
  const anchor: Record<string, unknown> = { click, remove: jest.fn() };
  (globalThis as { document?: unknown }).document = {
    createElement: jest.fn(() => anchor),
    body: { appendChild: jest.fn() },
  };
  return anchor;
}

// --- Tests -----------------------------------------------------------------

describe("sharePdf", () => {
  const TEMP_URI = "file:///Print/9f3c-uuid-1a2b.pdf";

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "ios";
    isAvailableMock.mockResolvedValue(true);
  });

  it("shares a file renamed to the invoice number, not the UUID temp file", async () => {
    await sharePdf(TEMP_URI, { fileName: "INV-0001", fallback: "invoice", dialogTitle: "Send" });

    expect(mockFileCopy).toHaveBeenCalledTimes(1);
    const sharedUri = shareAsyncMock.mock.calls[0][0];
    expect(sharedUri).toBe("file:///cache/INV-0001.pdf");
    expect(sharedUri).not.toContain("uuid");
  });

  it("sanitises path-dangerous characters in the number", async () => {
    await sharePdf(TEMP_URI, { fileName: "INV/2026/9", fallback: "invoice", dialogTitle: "Send" });
    expect(shareAsyncMock.mock.calls[0][0]).toBe("file:///cache/INV-2026-9.pdf");
  });

  it("falls back to the provided fallback name when no number is given", async () => {
    await sharePdf(TEMP_URI, { fallback: "credit-note", dialogTitle: "Send" });
    expect(shareAsyncMock.mock.calls[0][0]).toBe("file:///cache/credit-note.pdf");
  });

  it("shares the original uri if the copy fails", async () => {
    mockFileCopy.mockImplementationOnce(() => {
      throw new Error("disk full");
    });
    await sharePdf(TEMP_URI, { fileName: "INV-1", fallback: "invoice", dialogTitle: "Send" });
    expect(shareAsyncMock.mock.calls[0][0]).toBe(TEMP_URI);
  });

  it("throws when native sharing is unavailable", async () => {
    isAvailableMock.mockResolvedValue(false);
    await expect(
      sharePdf(TEMP_URI, { fileName: "INV-1", fallback: "invoice", dialogTitle: "Send" }),
    ).rejects.toThrow("Sharing is not available");
  });

  it("downloads with the numbered filename on web", async () => {
    Platform.OS = "web";
    const anchor = stubDom();
    await sharePdf("data:application/pdf;base64,AAAA", {
      fileName: "INV-0007",
      fallback: "invoice",
      dialogTitle: "Send",
    });
    expect(anchor.download).toBe("INV-0007.pdf");
    expect(shareAsyncMock).not.toHaveBeenCalled();
  });
});
