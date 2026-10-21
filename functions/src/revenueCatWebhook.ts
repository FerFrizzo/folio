import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { adminDb } from "./lib/admin";
import {
  RC_EVENT_MAP,
  RcPayloadSchema,
  auditEventPath,
  isAuthorized,
  subscriptionWrites,
} from "./lib/revenueCat";

const RC_WEBHOOK_SECRET = defineSecret("REVENUECAT_WEBHOOK_SECRET");

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

    if (!isAuthorized(req.headers.authorization, RC_WEBHOOK_SECRET.value())) {
      console.warn("revenueCatWebhook: unauthorized request");
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

    const now = new Date().toISOString();
    const writes = subscriptionWrites(event, mapping, now);
    if (writes.length === 0) {
      // Only anonymous ids: nothing to unlock until a TRANSFER/alias links the
      // purchase to a Firebase UID. Still audited below.
      console.warn("revenueCatWebhook: no Firebase UID on event", event.type, event.id);
    }

    const db = adminDb();
    const batch = db.batch();
    for (const { uid, doc } of writes) {
      batch.set(db.doc(`users/${uid}/subscription/main`), doc, { merge: true });
    }
    batch.set(db.doc(auditEventPath(event.id)), {
      eventId: event.id,
      eventType: event.type,
      uids: writes.map((w) => w.uid),
      writes: writes.map((w) => w.doc),
      receivedAt: now,
    });
    await batch.commit();

    res.status(200).send("ok");
  },
);
