import { recordInvoiceSent } from "@/src/features/review";

// The tail of the manual "Mark sent & share" flow. The send only counts
// towards the review prompt once the share sheet has resolved — prompting
// while the sheet is still up would be hidden behind it and burn the
// one-shot third_sent trigger.
export async function completeManualSend(steps: {
  share: () => Promise<void>;
  onShared: () => void;
}): Promise<void> {
  await steps.share();
  void recordInvoiceSent();
  steps.onShared();
}
