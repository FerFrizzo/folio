import { timingSafeEqual } from "crypto";
import { z } from "zod";

// Maps RevenueCat event types to the subscription state we write to Firestore.
// null means "known but ignored" — respond 200 without writing.
export type StateMapping = { state: string; entitlement: "free" | "pro" } | null;

export const RC_EVENT_MAP: Record<string, StateMapping> = {
  INITIAL_PURCHASE: { state: "trial",  entitlement: "pro"  },
  TRIAL_CONVERTED:  { state: "active", entitlement: "pro"  },
  RENEWAL:          { state: "active", entitlement: "pro"  },
  PRODUCT_CHANGE:   { state: "active", entitlement: "pro"  },
  CANCELLATION:     { state: "active", entitlement: "pro"  }, // still active until period end
  UNCANCELLATION:   { state: "active", entitlement: "pro"  },
  EXPIRATION:       { state: "lapsed", entitlement: "free" },
  BILLING_ISSUE:    { state: "grace",  entitlement: "pro"  },
  TRIAL_CANCELLED:  { state: "free",   entitlement: "free" },
  // A restore moved the subscription between app users (e.g. bought before
  // Purchases.logIn ran, then restored on the real account). The receivers
  // get Pro and the senders lose it; see subscriptionWrites.
  TRANSFER:         { state: "active", entitlement: "pro"  },
  // Informational events we don't act on:
  SUBSCRIBER_ALIAS: null,
  NON_RENEWING_PURCHASE: null,
};

export const RcPayloadSchema = z.object({
  event: z.object({
    type: z.string(),
    id: z.string(),
    // The Firebase UID we pass via Purchases.logIn(uid), or a RevenueCat
    // anonymous id if the purchase happened before logIn. Absent on TRANSFER.
    app_user_id: z.string().optional(),
    original_app_user_id: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    transferred_from: z.array(z.string()).optional(),
    transferred_to: z.array(z.string()).optional(),
    product_id: z.string().optional(),
    expiration_at_ms: z.number().optional(),
    grace_period_expiration_at_ms: z.number().optional(),
  }),
  api_version: z.string().optional(),
});
export type RcEvent = z.infer<typeof RcPayloadSchema>["event"];

// RevenueCat sends the "Authorization header value" configured in its
// dashboard as the standard Authorization header, verbatim. Accept it with or
// without a "Bearer " prefix so either dashboard setting works.
export function isAuthorized(header: string | string[] | undefined, secret: string): boolean {
  if (!secret || typeof header !== "string") return false;
  const value = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;
  const a = Buffer.from(value);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isAnonymousAppUserId(id: string): boolean {
  return id.startsWith("$RCAnonymousID:");
}

// The Firebase UID an event belongs to. Anonymous ids are never real users, so
// fall back to the original id or an alias that is a UID.
export function resolveUid(event: RcEvent): string | null {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  for (const id of candidates) {
    if (id && !isAnonymousAppUserId(id)) return id;
  }
  return null;
}

export type SubscriptionWrite = { uid: string; doc: Record<string, unknown> };

// Every users/{uid}/subscription/main write an event implies. Never targets an
// anonymous id: those docs would sit under a user that doesn't exist.
export function subscriptionWrites(
  event: RcEvent,
  mapping: NonNullable<StateMapping>,
  now: string,
): SubscriptionWrite[] {
  if (event.type === "TRANSFER") {
    const real = (ids: string[] | undefined) => (ids ?? []).filter((id) => !isAnonymousAppUserId(id));
    const to = real(event.transferred_to).map((uid) => ({
      uid,
      doc: { entitlement: "pro", state: "active", rcUserId: uid, updatedAt: now },
    }));
    const from = real(event.transferred_from).map((uid) => ({
      uid,
      doc: { entitlement: "free", state: "free", rcUserId: uid, updatedAt: now },
    }));
    return [...to, ...from];
  }

  const uid = resolveUid(event);
  if (!uid) return [];

  const doc: Record<string, unknown> = {
    entitlement: mapping.entitlement,
    state: mapping.state,
    rcUserId: uid,
    updatedAt: now,
  };
  if (event.product_id) doc.productId = event.product_id;
  if (event.expiration_at_ms) {
    doc.currentPeriodEndsAt = new Date(event.expiration_at_ms).toISOString();
  }
  // Our 7-day soft grace: we compute gracePeriodEndsAt from the expiration
  // plus 7 days whenever Apple/Google reports a billing issue.
  if (event.type === "BILLING_ISSUE") {
    const baseMs = event.expiration_at_ms ?? Date.now();
    doc.gracePeriodEndsAt = new Date(baseMs + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  return [{ uid, doc }];
}

// audit/subscriptionEvents/events/{eventId}. Firestore document paths need an
// even number of segments; the old audit/subscriptionEvents/{id} threw.
export function auditEventPath(eventId: string): string {
  return `audit/subscriptionEvents/events/${eventId}`;
}
