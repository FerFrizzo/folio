import {
  RC_EVENT_MAP,
  auditEventPath,
  isAnonymousAppUserId,
  isAuthorized,
  resolveUid,
  subscriptionWrites,
  type RcEvent,
} from "./revenueCat";

const NOW = "2026-10-22T00:00:00.000Z";
const ANON = "$RCAnonymousID:abc123";

function event(partial: Partial<RcEvent>): RcEvent {
  return { type: "INITIAL_PURCHASE", id: "evt_1", ...partial };
}

describe("isAuthorized", () => {
  // Regression: the handler read a custom x-revenuecat-webhook-auth header,
  // which RevenueCat never sends, so every event got a 401.
  it("accepts the secret in the Authorization header", () => {
    expect(isAuthorized("s3cret", "s3cret")).toBe(true);
  });

  it("accepts a Bearer-prefixed secret", () => {
    expect(isAuthorized("Bearer s3cret", "s3cret")).toBe(true);
  });

  it.each([
    ["wrong value", "nope", "s3cret"],
    ["missing header", undefined, "s3cret"],
    ["array header", ["s3cret"], "s3cret"],
    ["different length", "s3cret-longer", "s3cret"],
    ["empty secret", "", ""],
  ] as const)("rejects %s", (_, header, secret) => {
    expect(isAuthorized(header as string | string[] | undefined, secret)).toBe(false);
  });
});

describe("resolveUid", () => {
  it("uses app_user_id when it is a Firebase UID", () => {
    expect(resolveUid(event({ app_user_id: "uid-1" }))).toBe("uid-1");
  });

  it("skips anonymous ids and falls back to original_app_user_id", () => {
    expect(resolveUid(event({ app_user_id: ANON, original_app_user_id: "uid-1" }))).toBe("uid-1");
  });

  it("falls back to an alias", () => {
    expect(resolveUid(event({ app_user_id: ANON, aliases: [ANON, "uid-2"] }))).toBe("uid-2");
  });

  it("returns null when only anonymous ids are present", () => {
    expect(resolveUid(event({ app_user_id: ANON, aliases: [ANON] }))).toBeNull();
    expect(isAnonymousAppUserId(ANON)).toBe(true);
  });
});

describe("subscriptionWrites", () => {
  it("writes Pro for an initial purchase", () => {
    const writes = subscriptionWrites(
      event({ app_user_id: "uid-1", product_id: "folio_pro_monthly", expiration_at_ms: Date.parse(NOW) }),
      RC_EVENT_MAP.INITIAL_PURCHASE!,
      NOW,
    );
    expect(writes).toEqual([
      {
        uid: "uid-1",
        doc: {
          entitlement: "pro",
          state: "trial",
          rcUserId: "uid-1",
          updatedAt: NOW,
          productId: "folio_pro_monthly",
          currentPeriodEndsAt: NOW,
        },
      },
    ]);
  });

  it("downgrades on expiration", () => {
    const [w] = subscriptionWrites(event({ type: "EXPIRATION", app_user_id: "uid-1" }), RC_EVENT_MAP.EXPIRATION!, NOW);
    expect(w?.doc).toMatchObject({ entitlement: "free", state: "lapsed" });
  });

  it("adds a 7-day grace period on billing issues", () => {
    const exp = Date.parse(NOW);
    const [w] = subscriptionWrites(
      event({ type: "BILLING_ISSUE", app_user_id: "uid-1", expiration_at_ms: exp }),
      RC_EVENT_MAP.BILLING_ISSUE!,
      NOW,
    );
    expect(w?.doc.gracePeriodEndsAt).toBe(new Date(exp + 7 * 86_400_000).toISOString());
  });

  // Regression: anonymous purchases were written to users/$RCAnonymousID…,
  // a user that doesn't exist.
  it("never writes to an anonymous id", () => {
    expect(subscriptionWrites(event({ app_user_id: ANON }), RC_EVENT_MAP.INITIAL_PURCHASE!, NOW)).toEqual([]);
  });

  // Regression: TRANSFER was ignored, so a purchase restored onto the real
  // account never unlocked Pro.
  it("moves Pro to the real receivers of a transfer and downgrades senders", () => {
    const writes = subscriptionWrites(
      event({ type: "TRANSFER", transferred_from: [ANON, "uid-old"], transferred_to: ["uid-new"] }),
      RC_EVENT_MAP.TRANSFER!,
      NOW,
    );
    expect(writes).toEqual([
      { uid: "uid-new", doc: { entitlement: "pro", state: "active", rcUserId: "uid-new", updatedAt: NOW } },
      { uid: "uid-old", doc: { entitlement: "free", state: "free", rcUserId: "uid-old", updatedAt: NOW } },
    ]);
  });
});

describe("auditEventPath", () => {
  it("has an even number of segments (a document path)", () => {
    expect(auditEventPath("evt_1").split("/")).toHaveLength(4);
  });
});
