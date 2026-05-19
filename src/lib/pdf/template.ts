// Re-export shim. The canonical template is now template-pro.ts.
// Use template-pro.ts (Pro tier) or template-free.ts (Free tier with watermark)
// directly; this shim exists to avoid breaking any stale imports.
export { renderInvoiceHtml, type RenderInvoiceArgs } from "./template-pro";
