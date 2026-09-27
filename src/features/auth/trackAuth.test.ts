const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
const mockInfo = jest.fn();
jest.mock("firebase/auth", () => ({
  getAdditionalUserInfo: (...a: unknown[]) => mockInfo(...a),
}));

import { trackAuthResult } from "@/src/features/auth/trackAuth";

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
