import {
  COOLDOWN_MS,
  initialReviewState,
  shouldPrompt,
  type ReviewState,
} from "@/src/features/review/rules";

const NOW = new Date("2026-10-01T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function state(patch: Partial<ReviewState> = {}): ReviewState {
  return { ...initialReviewState, ...patch };
}

describe("shouldPrompt", () => {
  it("fires first_paid on a fresh install", () => {
    expect(shouldPrompt(state(), "first_paid", NOW)).toBe(true);
  });

  it("does not fire a trigger twice", () => {
    expect(shouldPrompt(state({ firedTriggers: ["first_paid"] }), "first_paid", NOW)).toBe(false);
  });

  it("third_sent needs at least three sends", () => {
    expect(shouldPrompt(state({ sentCount: 2 }), "third_sent", NOW)).toBe(false);
    expect(shouldPrompt(state({ sentCount: 3 }), "third_sent", NOW)).toBe(true);
    expect(shouldPrompt(state({ sentCount: 7 }), "third_sent", NOW)).toBe(true);
  });

  it("first_paid does not depend on sends", () => {
    expect(shouldPrompt(state({ sentCount: 0 }), "first_paid", NOW)).toBe(true);
  });

  it("respects the 90-day cooldown at its boundary", () => {
    const at = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString();
    const s89 = state({ sentCount: 3, firedTriggers: ["first_paid"], lastPromptAt: at(89 * DAY) });
    const s90 = state({ sentCount: 3, firedTriggers: ["first_paid"], lastPromptAt: at(COOLDOWN_MS) });
    expect(shouldPrompt(s89, "third_sent", NOW)).toBe(false);
    expect(shouldPrompt(s90, "third_sent", NOW)).toBe(true);
  });

  it("treats an unparseable lastPromptAt as no previous prompt", () => {
    expect(shouldPrompt(state({ lastPromptAt: "not-a-date" }), "first_paid", NOW)).toBe(true);
  });
});
