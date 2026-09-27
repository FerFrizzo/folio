import type { ReviewTrigger } from "@/src/lib/analytics";

// Pure policy for when Folio asks for an App Store rating. Apple additionally
// caps the system sheet at 3 per 365 days; these rules sit underneath that.

export type ReviewState = {
  sentCount: number;
  firedTriggers: ReviewTrigger[];
  lastPromptAt: string | null;
};

export const initialReviewState: ReviewState = {
  sentCount: 0,
  firedTriggers: [],
  lastPromptAt: null,
};

export const SENT_THRESHOLD = 3;
export const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

export function shouldPrompt(state: ReviewState, trigger: ReviewTrigger, now: Date): boolean {
  if (state.firedTriggers.includes(trigger)) return false;
  if (trigger === "third_sent" && state.sentCount < SENT_THRESHOLD) return false;
  if (state.lastPromptAt) {
    const last = Date.parse(state.lastPromptAt);
    if (!Number.isNaN(last) && now.getTime() - last < COOLDOWN_MS) return false;
  }
  return true;
}
