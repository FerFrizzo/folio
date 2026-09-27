import { Platform } from "react-native";
import * as StoreReview from "expo-store-review";
import { track, type ReviewTrigger } from "@/src/lib/analytics";
import { shouldPrompt, type ReviewState } from "@/src/features/review/rules";
import { loadReviewState, saveReviewState } from "@/src/features/review/store";

// Asks for an App Store rating after a positive moment. Callers fire and
// forget (`void recordInvoicePaid()`); nothing here ever throws.

export type ReviewDeps = {
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
  platform: string;
};

// Let the success toast land before the system sheet slides up.
const PROMPT_DELAY_MS = 1500;

const defaultDeps: ReviewDeps = {
  now: () => new Date(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  platform: Platform.OS,
};

async function maybePrompt(trigger: ReviewTrigger, state: ReviewState, deps: ReviewDeps): Promise<void> {
  if (deps.platform === "web") return;
  const now = deps.now();
  if (!shouldPrompt(state, trigger, now)) return;
  if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return;

  // Persist first: if requestReview hangs or the app is killed, we still
  // don't ask again for this trigger.
  await saveReviewState({
    ...state,
    firedTriggers: [...state.firedTriggers, trigger],
    lastPromptAt: now.toISOString(),
  });
  await deps.sleep(PROMPT_DELAY_MS);
  await StoreReview.requestReview();
  track("review_prompt_shown", { trigger });
}

export async function recordInvoiceSent(deps: ReviewDeps = defaultDeps): Promise<void> {
  try {
    const loaded = await loadReviewState();
    const state = { ...loaded, sentCount: loaded.sentCount + 1 };
    await saveReviewState(state);
    await maybePrompt("third_sent", state, deps);
  } catch (err) {
    console.warn("[review] recordInvoiceSent failed", err);
  }
}

export async function recordInvoicePaid(deps: ReviewDeps = defaultDeps): Promise<void> {
  try {
    await maybePrompt("first_paid", await loadReviewState(), deps);
  } catch (err) {
    console.warn("[review] recordInvoicePaid failed", err);
  }
}
