import { readFileSync } from "fs";
import { join } from "path";
import { Platform } from "react-native";
import {
  CREDIT_NOTE_PAGE_MARGINS_MM,
  INVOICE_PAGE_MARGINS_MM,
  mmToPt,
  pdfPrintOptions,
  type PageMarginsMm,
} from "@/src/lib/pdf/print-options";

const ORIGINAL_OS = Platform.OS;
function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
}
afterEach(() => setOS(ORIGINAL_OS));

// Expand a CSS margin shorthand ("18mm 16mm 20mm") the way browsers do.
function cssPageMargins(file: string): PageMarginsMm {
  const src = readFileSync(join(__dirname, file), "utf8");
  const match = src.match(/@page\s*{[^}]*margin:\s*([^;]+);/);
  if (!match?.[1]) throw new Error(`No @page margin in ${file}`);
  const v = match[1].trim().split(/\s+/).map((p) => Number(p.replace("mm", "")));
  const [top, right = top, bottom = top, left = right] = v as [number, ...number[]];
  return { top, right, bottom, left };
}

describe("page margin constants", () => {
  it("match the invoice template's @page margin", () => {
    expect(cssPageMargins("template-pro.ts")).toEqual(INVOICE_PAGE_MARGINS_MM);
  });

  it("match the credit note template's @page margin", () => {
    expect(cssPageMargins("credit-note-template.ts")).toEqual(CREDIT_NOTE_PAGE_MARGINS_MM);
  });
});

describe("mmToPt", () => {
  it("converts millimetres to points", () => {
    expect(mmToPt(25.4)).toBe(72);
    expect(mmToPt(16)).toBe(45.35);
    expect(mmToPt(0)).toBe(0);
  });
});

describe("pdfPrintOptions", () => {
  // Regression: no margins were passed on iOS, where @page is ignored, so
  // invoices printed edge to edge and the left side was clipped.
  it("passes the template margins in points on iOS", () => {
    setOS("ios");
    expect(pdfPrintOptions("<p/>", INVOICE_PAGE_MARGINS_MM)).toEqual({
      html: "<p/>",
      base64: false,
      width: 595,
      height: 842,
      margins: { top: 34.02, right: 45.35, bottom: 34.02, left: 45.35 },
    });
  });

  it("uses the credit note margins when given them", () => {
    setOS("ios");
    expect(pdfPrintOptions("<p/>", CREDIT_NOTE_PAGE_MARGINS_MM).margins).toEqual({
      top: 56.69,
      right: 42.52,
      bottom: 56.69,
      left: 42.52,
    });
  });

  // Regression: the iOS margin fix stopped left-edge clipping but the old
  // 18mm/20mm vertical margins, on top of a narrower line, pushed a one-page
  // invoice onto a second sheet. Side margins stay large enough to clear the
  // printer's unprintable area.
  it("keeps a 16mm side margin and a shorter vertical margin", () => {
    expect(INVOICE_PAGE_MARGINS_MM.left).toBe(16);
    expect(INVOICE_PAGE_MARGINS_MM.right).toBe(16);
    expect(INVOICE_PAGE_MARGINS_MM.top + INVOICE_PAGE_MARGINS_MM.bottom).toBeLessThanOrEqual(24);
    const printable =
      842 - mmToPt(INVOICE_PAGE_MARGINS_MM.top) - mmToPt(INVOICE_PAGE_MARGINS_MM.bottom);
    expect(printable).toBeGreaterThan(760);
  });

  it.each(["android", "web"] as const)("leaves margins to CSS @page on %s", (os) => {
    setOS(os);
    const options = pdfPrintOptions("<p/>", INVOICE_PAGE_MARGINS_MM);
    expect(options.margins).toBeUndefined();
    expect(options).toMatchObject({ width: 595, height: 842, base64: false });
  });
});
