jest.mock("@/lib/firebase", () => ({ getFirebaseAuth: () => ({}) }));
jest.mock("@/src/features/auth/trackAuth", () => ({ trackAuthResult: jest.fn() }));
jest.mock("firebase/auth", () => ({}));

import { idTokenFrom } from "@/src/features/auth/linking/google";

describe("idTokenFrom", () => {
  it("returns the ID token on success", () => {
    expect(idTokenFrom({ type: "success", data: { idToken: "tok" } })).toBe("tok");
  });

  // Regression: v16 of the SDK resolves (not rejects) on cancel, which we
  // reported as "did not return an ID token" → reason "unknown".
  it("throws a cancelled code when the user closes the Google sheet", () => {
    expect(() => idTokenFrom({ type: "cancelled", data: null })).toThrow(
      expect.objectContaining({ code: "google/cancelled" }),
    );
  });

  it("throws a distinct code when Google returns no ID token", () => {
    expect(() => idTokenFrom({ type: "success", data: { idToken: null } })).toThrow(
      expect.objectContaining({ code: "google/no-id-token" }),
    );
  });
});
