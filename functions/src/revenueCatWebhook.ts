import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { z } from "zod";
import { adminDb } from "./lib/admin";

const RC_WEBHOOK_SECRET = defineSecret("REVENUECAT_WEBHOOK_SECRET");

// Maps RevenueCat event types to the subscription state we write to Firestore.
// null means "known but ignored" — respond 200 without writing.
type StateMapping = { state: string; entitlement: "free" | "pro" } | null;

const RC_EVENT_MAP: Record<string, StateMapping> = {
  INITIAL_PURCHASE: { state: "trial",  entitlement: "pro"  },
  TRIAL_CONVERTED:  { state: "active", entitlement: "pro"  },
  RENEWAL:          { state: "active", entitlement: "pro"  },
  PRODUCT_CHANGE:   { state: "active", entitlement: "pro"  },
  CANCELLATION:     { state: "active", entitlement: "pro"  }, // still active until period end
  UNCANCELLATION:   { state: "active", entitlement: "pro"  },
  EXPIRATION:       { state: "lapsed", entitlement: "free" },
  BILLING_ISSUE:    { state: "grace",  entitlement: "pro"  },
  TRIAL_CANCELLED:  { state: "free",   entitlement: "free" },
  // Informational events we don't act on:
  SUBSCRIBER_ALIAS: null,
  TRANSFER:         null,
  NON_RENEWING_PURCHASE: null,
};

const RcPayloadSchema = z.object({
  event: z.object({
    type: z.string(),
    // app_user_id is the Firebase UID we pass via Purchases.logIn(uid)
    app_user_id: z.string(),
    product_id: z.string().optional(),
    expiration_at_ms: z.number().optional(),
    grace_period_expiration_at_ms: z.number().optional(),
    id: z.string(),
  }),
  api_version: z.string().optional(),
});

export const revenueCatWebhook = onRequest(
  {
    region: "australia-southeast1",
    secrets: [RC_WEBHOOK_SECRET],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Validate shared secret
    const authHeader = req.headers["x-revenuecat-webhook-auth"];
    if (authHeader !== RC_WEBHOOK_SECRET.value()) {
      res.status(401).send("Unauthorized");
      return;
    }

    const parsed = RcPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      console.warn("revenueCatWebhook: bad payload", parsed.error.issues);
      res.status(400).send("Bad payload");
      return;
    }

    const { event } = parsed.data;
    const mapping = RC_EVENT_MAP[event.type];

    if (mapping === null) {
      res.status(200).send("ok (ignored)");
      return;
    }
    if (mapping === undefined) {
      console.warn("revenueCatWebhook: unknown event type", event.type);
      res.status(200).send("ok (unknown event)");
      return;
    }

    const uid = event.app_user_id;
    const now = new Date().toISOString();

    const subDoc: Record<string, unknown> = {
      entitlement: mapping.entitlement,
      state: mapping.state,
      rcUserId: uid,
      updatedAt: now,
    };

    if (event.product_id) {
      subDoc.productId = event.product_id;
    }
    if (event.expiration_at_ms) {
      subDoc.currentPeriodEndsAt = new Date(event.expiration_at_ms).toISOString();
    }
    // Our 7-day soft grace: we compute gracePeriodEndsAt from the expiration
    // plus 7 days whenever Apple/Google reports a billing issue.
    if (event.type === "BILLING_ISSUE") {
      const baseMs = event.expiration_at_ms ?? Date.now();
      subDoc.gracePeriodEndsAt = new Date(baseMs + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    const db = adminDb();
    const subscriptionRef = db.doc(`users/${uid}/subscription/main`);
    const auditRef = db.doc(`audit/subscriptionEvents/${event.id}`);

    const batch = db.batch();
    batch.set(subscriptionRef, subDoc, { merge: true });
    batch.set(auditRef, {
      uid,
      eventId: event.id,
      eventType: event.type,
      ...subDoc,
      receivedAt: now,
    });
    await batch.commit();

    res.status(200).send("ok");
  },
);
