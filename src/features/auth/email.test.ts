const mockTrack = jest.fn();
jest.mock("@/src/lib/analytics", () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));
jest.mock("@/lib/firebase", () => ({ getFirebaseAuth: () => ({}) }));
const mockSignIn = jest.fn();
const mockCreate = jest.fn();
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...a: unknown[]) => mockSignIn(...a),
  createUserWithEmailAndPassword: (...a: unknown[]) => mockCreate(...a),
  updateProfile: jest.fn(async () => {}),
  sendPasswordResetEmail: jest.fn(),
}));

import { signInWithEmail, signUpWithEmail } from "@/src/features/auth/email";

beforeEach(() => jest.clearAllMocks());

it("tracks signed_up after email sign-up", async () => {
  mockCreate.mockResolvedValueOnce({ user: { uid: "u1" } });
  await signUpWithEmail("Sam", "sam@example.com", "pw123456");
  expect(mockTrack).toHaveBeenCalledWith("signed_up", { method: "email" });
});

it("tracks signed_in after email sign-in", async () => {
  mockSignIn.mockResolvedValueOnce({ user: { uid: "u1" } });
  await signInWithEmail("sam@example.com", "pw123456");
  expect(mockTrack).toHaveBeenCalledWith("signed_in", { method: "email" });
});

it("emits nothing when sign-in fails", async () => {
  mockSignIn.mockRejectedValueOnce(new Error("auth/wrong-password"));
  await expect(signInWithEmail("sam@example.com", "nope")).rejects.toThrow();
  expect(mockTrack).not.toHaveBeenCalled();
});
