// Turns an invoice/credit-note number (which is user-influenced via the
// numbering prefix) into a safe PDF filename. Needed because expo-print writes
// its temp file with a UUID name; when we share on native we copy it to a file
// named after this helper so the user sees "INV-0001.pdf", not a UUID.

// Path-dangerous / reserved characters across the platforms we target
// (iOS/Android, plus desktop when a shared file is saved elsewhere). Spaces and
// hyphens are valid filename characters and are intentionally kept.
const UNSAFE = /[/\\:*?"<>|]/g;

export function pdfFileName(rawName: string | undefined, fallback = "document"): string {
  const base = (rawName ?? "").trim();
  // Strip a trailing .pdf (any case) so callers can pass either "INV-1" or
  // "INV-1.pdf" and we never double up the extension.
  const withoutExt = /\.pdf$/i.test(base) ? base.slice(0, -4) : base;
  const sanitized = withoutExt
    .replace(UNSAFE, "-")
    // Collapse whitespace runs so tabs/newlines don't survive into the name.
    .replace(/\s+/g, " ")
    // A leading dot hides the file on unix; a trailing dot/space is dropped by
    // Windows. Strip both ends.
    .replace(/^[.\s]+/, "")
    .replace(/[.\s]+$/, "");
  const finalBase = sanitized.length > 0 ? sanitized : fallback;
  return `${finalBase}.pdf`;
}
