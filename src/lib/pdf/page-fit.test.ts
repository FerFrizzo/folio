import { existsSync } from "fs";
import { createRequire } from "module";
import { renderInvoiceHtml as renderFree } from "@/src/lib/pdf/template-free";
import { INVOICE_PAGE_MARGINS_MM, mmToPt } from "@/src/lib/pdf/print-options";
import type { Invoice, Profile, Settings } from "@/src/types/schemas";
import { ProfileSchema, SettingsSchema } from "@/src/types/schemas";

// A free-tier invoice of this shape filled one full-bleed A4 page before iOS
// gained native page margins (about 842pt of content). Side margins make the
// line narrower, so the copy gets taller and has to fit in the printable
// height rather than the full sheet.
const LINE_COUNT = 6;

const profile: Profile = ProfileSchema.parse({
  businessName: "Bullens Electrical",
  abn: "53004085616",
  address: "18 Station Street\nFremantle WA 6160",
  email: "bart@outlook.com.au",
  phone: "0491 262 626",
  gstRegistered: true,
});

const settings: Settings = SettingsSchema.parse({
  paymentDetails: {
    bsb: "066-000",
    accNumber: "1234 5678",
    accName: "Bullens Electrical",
    payId: "bart@outlook.com.au",
  },
});

function line(description: string, cents: number) {
  const gst = Math.round(cents * 0.1);
  return {
    description,
    qty: 1,
    unitPriceCents: cents,
    gstRate: 0.1,
    lineDiscountAmountCents: 0,
    taxableCents: cents,
    gstAmountCents: gst,
    lineTotalCents: cents + gst,
  };
}

const seeds = [
  line("Supply and install LED downlights", 48000),
  line("Replace switchboard breakers", 32000),
  line("Test and tag portable appliances", 15000),
  line("Call-out and labour", 22000),
];

function typicalInvoice(): Invoice {
  const items = Array.from({ length: LINE_COUNT }, (_, i) => seeds[i % seeds.length]!);
  const subtotalCents = items.reduce((sum, item) => sum + item.taxableCents, 0);
  const gstTotalCents = items.reduce((sum, item) => sum + item.gstAmountCents, 0);
  return {
    id: "inv_1",
    number: "INV-0007",
    status: "sent",
    currency: "AUD",
    clientId: "c1",
    clientSnapshot: {
      name: "Harbour Cafe Pty Ltd",
      abn: "51824753556",
      address: "4 South Terrace\nFremantle WA 6160",
    },
    issueDate: "2026-10-01",
    lineItems: items,
    subtotalCents,
    lineDiscountTotalCents: 0,
    invoiceDiscountTotalCents: 0,
    discountTotalCents: 0,
    gstTotalCents,
    totalCents: subtotalCents + gstTotalCents,
    amountPaidCents: 0,
    balanceCents: subtotalCents + gstTotalCents,
    payments: [],
    notes: "Thank you. Please pay within 14 days.",
    paymentInstructionsSnapshot: settings.paymentDetails,
    creditNoteIds: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

const CHROME = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/local/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((path) => existsSync(path));

type LaunchedBrowser = {
  newPage: () => Promise<{
    setViewport: (viewport: { width: number; height: number; deviceScaleFactor: number }) => Promise<void>;
    setContent: (html: string, options: { waitUntil: "domcontentloaded" }) => Promise<void>;
    emulateMediaType: (type: "print") => Promise<void>;
    evaluate: <T>(fn: () => T) => Promise<T>;
  }>;
  close: () => Promise<void>;
};

function loadPuppeteer(): { launch: (options: object) => Promise<LaunchedBrowser> } | null {
  const require = createRequire(__filename);
  for (const id of ["puppeteer-core", "../../../functions/node_modules/puppeteer-core"]) {
    try {
      return require(id) as { launch: (options: object) => Promise<LaunchedBrowser> };
    } catch {
      // Try the next location. App tests don't depend on puppeteer directly.
    }
  }
  return null;
}

const puppeteer = loadPuppeteer();
const canMeasure = Boolean(CHROME && puppeteer);

(canMeasure ? describe : describe.skip)("invoice page fit", () => {
  it("fits a typical free invoice on one page with the iOS side margins", async () => {
    const browser = await puppeteer!.launch({
      executablePath: CHROME,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      headless: true,
    });
    try {
      const page = await browser.newPage();
      // 595pt is the A4 width expo-print lays the HTML out in. iOS ignores
      // CSS @page, so the content height at this width has to fit inside the
      // printable height (sheet minus the native top and bottom margins).
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      const html = renderFree({ invoice: typicalInvoice(), profile, settings }).replace(
        /@page\s*{[^}]*}/,
        "@page { size: A4; margin: 0; }",
      );
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      await page.emulateMediaType("print");
      const bottomPx = await page.evaluate(() => {
        const last = document.body.lastElementChild as HTMLElement | null;
        return last ? last.getBoundingClientRect().bottom : document.body.scrollHeight;
      });
      const contentPt = (bottomPx * 72) / 96;
      const printablePt =
        842 - mmToPt(INVOICE_PAGE_MARGINS_MM.top) - mmToPt(INVOICE_PAGE_MARGINS_MM.bottom);
      expect(INVOICE_PAGE_MARGINS_MM.left).toBeGreaterThanOrEqual(16);
      expect(INVOICE_PAGE_MARGINS_MM.right).toBeGreaterThanOrEqual(16);
      expect(contentPt).toBeLessThan(printablePt);
    } finally {
      await browser.close();
    }
  }, 20000);
});
