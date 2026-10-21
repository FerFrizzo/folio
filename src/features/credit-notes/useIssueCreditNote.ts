import { useCallback, useRef, useState } from "react";
import type { CreditNote } from "@/src/types/schemas";

export type IssueOutcome =
  | { status: "issued"; creditNote: CreditNote }
  // The credit note is saved, but the PDF couldn't be generated or shared.
  // The caller must still leave the editor: staying invites a second tap that
  // issues a duplicate.
  | { status: "issued-share-failed"; creditNote: CreditNote; error: unknown }
  | { status: "failed"; error: unknown }
  // A previous issue is still in flight (e.g. a double tap).
  | { status: "busy" };

type Steps = {
  create: () => Promise<CreditNote>;
  share: (creditNote: CreditNote) => Promise<void>;
};

// Single-flight wrapper for issuing a credit note. The guard is a ref, not
// state, so a second tap landing before the re-render is still rejected.
export function useIssueCreditNote() {
  const inFlight = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const issue = useCallback(async ({ create, share }: Steps): Promise<IssueOutcome> => {
    if (inFlight.current) return { status: "busy" };
    inFlight.current = true;
    setSubmitting(true);
    try {
      let creditNote: CreditNote;
      try {
        creditNote = await create();
      } catch (error) {
        return { status: "failed", error };
      }
      try {
        await share(creditNote);
        return { status: "issued", creditNote };
      } catch (error) {
        return { status: "issued-share-failed", creditNote, error };
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, []);

  return { issue, submitting };
}
