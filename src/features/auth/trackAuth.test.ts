const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
const mockInfo = jest.fn();
jest.mock("firebase/auth", () => ({
  getAdditionalUserInfo: (...a: unknown[]) => mockInfo(...a),
}));

import { reportAuthError, trackAuthResult } from "@/src/features/auth/trackAuth";

const cred = {} as never;

beforeEach(() => jest.clearAllMocks());

it("tracks signed_up for a new user", () => {
  mockInfo.mockReturnValueOnce({ isNewUser: true });
  trackAuthResult(cred, "google");
  expect(mockTrack).toHaveBeenCalledWith("signed_up", { method: "google" });
});

it("tracks signed_in for a returning user", () => {
  mockInfo.mockReturnValueOnce({ isNewUser: false });
  trackAuthResult(cred, "apple");
  expect(mockTrack).toHaveBeenCalledWith("signed_in", { method: "apple" });
});

it("treats missing info as a sign-in", () => {
  mockInfo.mockReturnValueOnce(null);
  trackAuthResult(cred, "google");
  expect(mockTrack).toHaveBeenCalledWith("signed_in", { method: "google" });
});

it("never throws when Firebase throws", () => {
  mockInfo.mockImplementationOnce(() => {
    throw new Error("bad credential");
  });
  expect(() => trackAuthResult(cred, "google")).not.toThrow();
});

describe("reportAuthError", () => {
  it("tracks sign_in_failed with the classified reason and returns the message", () => {
    const message = reportAuthError({ code: "auth/invalid-credential" }, "email");
    expect(mockTrack).toHaveBeenCalledWith("sign_in_failed", {
      method: "email",
      reason: "wrong-credentials",
    });
    expect(message).toMatch(/email or password is incorrect/i);
  });

  it("tracks cancellations so abandoned social sign-ins are visible", () => {
    reportAuthError({ code: "auth/popup-closed-by-user" }, "google");
    expect(mockTrack).toHaveBeenCalledWith("sign_in_failed", {
      method: "google",
      reason: "popup-closed",
    });
  });

  it("never sends the raw error message", () => {
    reportAuthError({ code: "auth/x", message: "Firebase: Error (auth/x) for a@b.com" }, "apple");
    expect(JSON.stringify(mockTrack.mock.calls)).not.toMatch(/a@b\.com|Firebase/);
  });

  it("still returns a message when tracking throws", () => {
    mockTrack.mockImplementationOnce(() => {
      throw new Error("posthog down");
    });
    expect(reportAuthError({ code: "auth/network-request-failed" }, "email")).toMatch(
      /connection/i,
    );
  });
});
