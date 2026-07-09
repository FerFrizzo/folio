import { pdfFileName } from "@/src/lib/pdf/filename";

describe("pdfFileName", () => {
  // Happy path: the common auto-numbered format passes through untouched.
  it("uses the invoice number as the filename", () => {
    expect(pdfFileName("INV-0001")).toBe("INV-0001.pdf");
  });

  it("keeps spaces and hyphens", () => {
    expect(pdfFileName("Invoice 2026 001")).toBe("Invoice 2026 001.pdf");
    expect(pdfFileName("ACME-INV-0042")).toBe("ACME-INV-0042.pdf");
  });

  it("does not double up the .pdf extension when the caller already added it", () => {
    expect(pdfFileName("INV-0001.pdf")).toBe("INV-0001.pdf");
    expect(pdfFileName("INV-0001.PDF")).toBe("INV-0001.pdf");
  });

  // Edge cases: user-set prefixes can contain path-dangerous characters.
  it("replaces path separators and reserved characters with a hyphen", () => {
    expect(pdfFileName("INV/2026/001")).toBe("INV-2026-001.pdf");
    expect(pdfFileName("A\\B:C*D?E\"F<G>H|I")).toBe("A-B-C-D-E-F-G-H-I.pdf");
  });

  it("collapses internal whitespace runs", () => {
    expect(pdfFileName("INV\t\n 0001")).toBe("INV 0001.pdf");
  });

  it("trims surrounding whitespace and strips leading/trailing dots", () => {
    expect(pdfFileName("  INV-1  ")).toBe("INV-1.pdf");
    expect(pdfFileName("...INV-1...")).toBe("INV-1.pdf");
    expect(pdfFileName(".hidden")).toBe("hidden.pdf");
  });

  // Fallback: empty / whitespace / undefined / all-unsafe input must still
  // produce a valid, non-hidden filename rather than ".pdf" or "".
  it("falls back to a default when the name is empty or missing", () => {
    expect(pdfFileName("")).toBe("document.pdf");
    expect(pdfFileName("   ")).toBe("document.pdf");
    expect(pdfFileName(undefined)).toBe("document.pdf");
  });

  it("falls back when sanitising strips every character", () => {
    expect(pdfFileName("///")).toBe("---.pdf");
    expect(pdfFileName("...")).toBe("document.pdf");
  });

  it("honours a custom fallback", () => {
    expect(pdfFileName("", "credit-note")).toBe("credit-note.pdf");
    expect(pdfFileName(undefined, "credit-note")).toBe("credit-note.pdf");
  });
});
