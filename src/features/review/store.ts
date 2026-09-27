import { deviceStorage } from "@/src/lib/deviceStorage";
import type { ReviewTrigger } from "@/src/lib/analytics";
import { initialReviewState, type ReviewState } from "@/src/features/review/rules";

const KEY = "folio.review.state";
const TRIGGERS: readonly ReviewTrigger[] = ["first_paid", "third_sent"];

// Stored data may come from an older build or be corrupt; coerce field by
// field and never throw — the worst case is re-asking once.
function coerce(raw: unknown): ReviewState {
  if (!raw || typeof raw !== "object") return { ...initialReviewState };
  const r = raw as Record<string, unknown>;
  return {
    sentCount: typeof r.sentCount === "number" && r.sentCount >= 0 ? r.sentCount : 0,
    firedTriggers: Array.isArray(r.firedTriggers)
      ? r.firedTriggers.filter((t): t is ReviewTrigger =>
          (TRIGGERS as readonly unknown[]).includes(t),
        )
      : [],
    lastPromptAt: typeof r.lastPromptAt === "string" ? r.lastPromptAt : null,
  };
}

export async function loadReviewState(): Promise<ReviewState> {
  try {
    const raw = await deviceStorage.getItem(KEY);
    if (!raw) return { ...initialReviewState };
    return coerce(JSON.parse(raw));
  } catch {
    return { ...initialReviewState };
  }
}

export async function saveReviewState(state: ReviewState): Promise<void> {
  await deviceStorage.setItem(KEY, JSON.stringify(state));
}
