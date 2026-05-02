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
    expect(out.message).toMatch(/email is already in use/i);
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

  it("falls back to unknown but echoes a useful message", () => {
    const out = classifyLinkError({ code: "auth/something-new", message: "Detail" });
    expect(out.kind).toBe("unknown");
    expect(out.message).toBe("Detail");
  });

  it("treats messages containing 'cancel' as cancellations", () => {
    expect(
      classifyLinkError({ message: "User cancelled the sign-in flow" }).kind,
    ).toBe("cancelled");
  });
});
