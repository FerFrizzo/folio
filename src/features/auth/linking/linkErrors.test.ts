import { classifyLinkError } from "@/src/features/auth/linking/linkErrors";

describe("classifyLinkError", () => {
  it("maps credential-already-in-use to a friendly message", () => {
    const out = classifyLinkError({ code: "auth/credential-already-in-use" });
    expect(out.kind).toBe("credential-in-use");
    expect(out.message).toMatch(/already linked/i);
  });

  it("maps email-already-in-use distinctly", () => {
    const out = classifyLinkError({ code: "auth/email-already-in-use" });
    expect(out.kind).toBe("email-in-use");
    expect(out.message).toMatch(/already exists/i);
  });

  it("treats popup-closed as a cancellation", () => {
    expect(
      classifyLinkError({ code: "auth/popup-closed-by-user" }).kind,
    ).toBe("popup-closed");
    expect(
      classifyLinkError({ code: "auth/cancelled-popup-request" }).kind,
    ).toBe("popup-closed");
  });

  it("flags network errors specifically", () => {
    expect(
      classifyLinkError({ code: "auth/network-request-failed" }).kind,
    ).toBe("network");
  });

  it("falls back to unknown with a generic message", () => {
    const out = classifyLinkError({ code: "auth/something-new", message: "Detail" });
    expect(out.kind).toBe("unknown");
    expect(out.message).toMatch(/something went wrong/i);
  });

  it("never shows raw Firebase error text", () => {
    const out = classifyLinkError({
      code: "auth/internal-error",
      message: "Firebase: Error (auth/internal-error).",
    });
    expect(out.message).not.toMatch(/firebase|auth\//i);
  });

  it("handles non-object errors", () => {
    expect(classifyLinkError(undefined).kind).toBe("unknown");
    expect(classifyLinkError("boom").kind).toBe("unknown");
  });

  it.each([
    "auth/invalid-credential",
    "auth/wrong-password",
    "auth/user-not-found",
    "auth/invalid-login-credentials",
  ])("maps %s to wrong-credentials", (code) => {
    const out = classifyLinkError({ code, message: `Firebase: Error (${code}).` });
    expect(out.kind).toBe("wrong-credentials");
    expect(out.message).toMatch(/email or password is incorrect/i);
  });

  it.each([
    ["auth/invalid-email", "invalid-email", /valid email/i],
    ["auth/weak-password", "weak-password", /at least 8 characters/i],
    ["auth/too-many-requests", "too-many-requests", /too many attempts/i],
    ["auth/user-disabled", "user-disabled", /disabled/i],
  ] as const)("maps %s to %s", (code, kind, message) => {
    const out = classifyLinkError({ code });
    expect(out.kind).toBe(kind);
    expect(out.message).toMatch(message);
  });

  it("treats messages containing 'cancel' as cancellations", () => {
    expect(
      classifyLinkError({ message: "User cancelled the sign-in flow" }).kind,
    ).toBe("cancelled");
  });
});
