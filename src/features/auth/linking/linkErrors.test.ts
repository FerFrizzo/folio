import { classifyLinkError, safeErrorCode } from "@/src/features/auth/linking/linkErrors";

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

// Native Google / Apple SDK errors aren't Firebase codes; before these were
// mapped every one of them was reported as "unknown".
describe("native sign-in errors", () => {
  it.each([
    "google/cancelled",
    "12501", // Android GoogleSignInStatusCodes.SIGN_IN_CANCELLED
    "-5", // iOS kGIDSignInErrorCodeCanceled
    "ERR_REQUEST_CANCELED", // expo-apple-authentication
  ])("treats %s as a cancellation", (code) => {
    expect(classifyLinkError({ code, message: "x" }).kind).toBe("cancelled");
  });

  it("flags Google DEVELOPER_ERROR as a misconfiguration", () => {
    const out = classifyLinkError({ code: "10", message: "DEVELOPER_ERROR: Follow troubleshooting" });
    expect(out.kind).toBe("provider-misconfigured");
    expect(out.message).not.toMatch(/developer_error|troubleshooting/i);
  });

  it("flags missing Play services", () => {
    const out = classifyLinkError({ code: "PLAY_SERVICES_NOT_AVAILABLE" });
    expect(out.kind).toBe("play-services");
    expect(out.message).toMatch(/google play services/i);
  });

  it.each([
    "google/no-id-token",
    "apple/no-identity-token",
    "12500", // Android SIGN_IN_FAILED
    "ERR_REQUEST_FAILED",
    "ERR_REQUEST_UNKNOWN",
    "ERR_REQUEST_NOT_HANDLED",
    "ERR_REQUEST_INVALID_RESPONSE",
    "ERR_REQUEST_NOT_INTERACTIVE",
    "NULL_PRESENTER",
  ])("treats %s as a provider failure", (code) => {
    expect(classifyLinkError({ code }).kind).toBe("provider-failed");
  });

  it("names the provider instead of email/password for a rejected Google or Apple token", () => {
    expect(classifyLinkError({ code: "auth/invalid-credential" }, "google").message).toMatch(
      /google/i,
    );
    expect(classifyLinkError({ code: "auth/invalid-credential" }, "apple").message).toMatch(
      /apple/i,
    );
    expect(classifyLinkError({ code: "auth/invalid-credential" }, "email").message).toMatch(
      /email or password/i,
    );
  });
});

describe("safeErrorCode", () => {
  it("returns string and numeric codes", () => {
    expect(safeErrorCode({ code: "auth/network-request-failed" })).toBe("auth/network-request-failed");
    expect(safeErrorCode({ code: 10 })).toBe("10");
    expect(safeErrorCode({ code: "-5" })).toBe("-5");
  });

  it("returns none when there is no code", () => {
    expect(safeErrorCode(new Error("boom"))).toBe("none");
    expect(safeErrorCode(undefined)).toBe("none");
    expect(safeErrorCode("boom")).toBe("none");
  });

  it("refuses anything that could carry free text", () => {
    expect(safeErrorCode({ code: "user a@b.com failed" })).toBe("other");
    expect(safeErrorCode({ code: "x".repeat(65) })).toBe("other");
  });
});
