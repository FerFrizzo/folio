import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type Handler = (req: unknown, res: unknown) => Promise<void>;

jest.mock("firebase-functions/v2/https", () => ({
  onRequest: (_opts: unknown, handler: Handler) => handler,
}));
jest.mock("firebase-functions/params", () => ({
  defineSecret: () => ({ value: () => "s3cret" }),
}));

// A real Firestore client validates document paths offline (the old audit
// path threw here); commits are recorded instead of sent.
const mockFirestore = getFirestore(initializeApp({ projectId: "demo-folio" }, "webhook-test"));
const mockSets: { path: string; data: Record<string, unknown> }[] = [];
const mockCommit = jest.fn();
jest.mock("./lib/admin", () => ({
  adminDb: () => ({
    doc: (path: string) => mockFirestore.doc(path),
    batch: () => ({
      set: (ref: { path: string }, data: Record<string, unknown>) => mockSets.push({ path: ref.path, data }),
      commit: mockCommit,
    }),
  }),
}));

import { revenueCatWebhook } from "./revenueCatWebhook";

function response() {
  const res = { statusCode: 0, body: "", status: jest.fn(), send: jest.fn() };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.send.mockImplementation((body: string) => {
    res.body = body;
    return res;
  });
  return res;
}

async function call(body: unknown, headers: Record<string, string> = { authorization: "s3cret" }, method = "POST") {
  const res = response();
  await (revenueCatWebhook as unknown as Handler)({ method, headers, body }, res);
  return res;
}

beforeEach(() => {
  mockSets.length = 0;
  mockCommit.mockReset().mockResolvedValue(undefined);
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const purchase = {
  event: { type: "INITIAL_PURCHASE", id: "evt_1", app_user_id: "uid-1", product_id: "folio_pro_monthly" },
};

describe("revenueCatWebhook", () => {
  it("rejects non-POST requests", async () => {
    expect((await call(purchase, {}, "GET")).statusCode).toBe(405);
  });

  it("rejects a missing or wrong Authorization header", async () => {
    expect((await call(purchase, {})).statusCode).toBe(401);
    expect((await call(purchase, { authorization: "nope" })).statusCode).toBe(401);
    // The old custom header is not accepted on its own.
    expect((await call(purchase, { "x-revenuecat-webhook-auth": "s3cret" })).statusCode).toBe(401);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("rejects a bad payload", async () => {
    expect((await call({ nope: true })).statusCode).toBe(400);
  });

  // Regression: every real event was rejected (401) or, past auth, threw on
  // the odd-segment audit path, so no purchase ever unlocked Pro.
  it("unlocks Pro on a purchase and audits it", async () => {
    const res = await call(purchase);
    expect(res.statusCode).toBe(200);
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockSets).toEqual([
      {
        path: "users/uid-1/subscription/main",
        data: expect.objectContaining({ entitlement: "pro", state: "trial", productId: "folio_pro_monthly" }),
      },
      {
        path: "audit/subscriptionEvents/events/evt_1",
        data: expect.objectContaining({ eventId: "evt_1", eventType: "INITIAL_PURCHASE", uids: ["uid-1"] }),
      },
    ]);
  });

  it("accepts a Bearer-prefixed secret", async () => {
    expect((await call(purchase, { authorization: "Bearer s3cret" })).statusCode).toBe(200);
  });

  it("audits but does not write a subscription for anonymous-only events", async () => {
    const res = await call({ event: { type: "INITIAL_PURCHASE", id: "evt_2", app_user_id: "$RCAnonymousID:x" } });
    expect(res.statusCode).toBe(200);
    expect(mockSets.map((s) => s.path)).toEqual(["audit/subscriptionEvents/events/evt_2"]);
  });

  it("applies a transfer to the real account", async () => {
    const res = await call({
      event: { type: "TRANSFER", id: "evt_3", transferred_from: ["$RCAnonymousID:x"], transferred_to: ["uid-1"] },
    });
    expect(res.statusCode).toBe(200);
    expect(mockSets[0]).toEqual({
      path: "users/uid-1/subscription/main",
      data: expect.objectContaining({ entitlement: "pro", state: "active" }),
    });
  });

  it("acknowledges ignored and unknown events without writing", async () => {
    expect((await call({ event: { type: "SUBSCRIBER_ALIAS", id: "e", app_user_id: "uid-1" } })).body).toBe("ok (ignored)");
    expect((await call({ event: { type: "SOMETHING_NEW", id: "e", app_user_id: "uid-1" } })).body).toBe("ok (unknown event)");
    expect(mockCommit).not.toHaveBeenCalled();
  });
});
