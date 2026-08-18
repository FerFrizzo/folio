// Preconditions for saving and sending an invoice. Pure so the rules can be
// tested without standing up the editor screen; each returns the message to
// show the user, or null when the action may proceed.
import type { ClientSnapshot } from "@/src/types/schemas";

const NO_CLIENT = "Pick a client first.";

// Trimmed, not just falsy: the schema's min(1) accepts " ", which would issue an
// invoice addressed to nobody.
function hasClient(snapshot: ClientSnapshot): boolean {
  return snapshot.name.trim() !== "";
}

// Saving a draft only needs a client. Everything else is still in flight —
// that's what a draft is for.
export function draftBlocker(input: { clientSnapshot: ClientSnapshot }): string | null {
  return hasClient(input.clientSnapshot) ? null : NO_CLIENT;
}

export function sendBlocker(input: {
  clientSnapshot: ClientSnapshot;
  lineCount: number;
  issueDate: string;
  totalCents: number;
  discountTotalCents: number;
  grossSubtotalCents: number;
}): string | null {
  if (!hasClient(input.clientSnapshot)) return NO_CLIENT;
  if (input.lineCount === 0) return "Add at least one line item.";
  if (!input.issueDate) return "Issue date is required.";
  if (input.totalCents <= 0) return "Total must be greater than zero.";
  if (input.discountTotalCents > input.grossSubtotalCents) {
    return "Total discount can't exceed the subtotal.";
  }
  return null;
}
