import { renderInvoiceHtml as renderProHtml, type RenderInvoiceArgs } from "./template-pro";

export type { RenderInvoiceArgs };

// Wraps the Pro template with two free-tier indicators:
// 1. A subtle grey page background tint.
// 2. A footer with the business logo (if set) and "Made with Folio" text.
// Both are baked into the HTML — they cannot be toggled via CSS from the client.
const FOLIO_MARK = `<img src="data:image/png;base64,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" alt="Folio" style="width:16pt;height:16pt;object-fit:contain;vertical-align:middle;margin-right:5pt;border-radius:3pt;" />`;

export function renderInvoiceHtml(args: RenderInvoiceArgs): string {
  const html = renderProHtml(args);

  const withCss = html.replace(
    "html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
    `html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background-color: #F3F4F6; }`,
  ).replace(
    "</style>",
    `    .folio-watermark {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 24pt;
      padding-top: 8pt;
      border-top: 0.5pt solid #D1D5DB;
      font-family: "Inter", sans-serif;
      font-size: 9pt;
      color: #6B7280;
    }\n  </style>`,
  );

  return withCss.replace(
    "</body>",
    `  <div class="folio-watermark">${FOLIO_MARK}Made with Folio</div>\n</body>`,
  );
}
