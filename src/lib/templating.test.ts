import { substituteEmailVars } from "@/src/lib/templating";

describe("substituteEmailVars", () => {
  it("substitutes named placeholders", () => {
    const out = substituteEmailVars("Hi {{clientName}}, invoice {{number}}.", {
      clientName: "Acme",
      number: "INV-0001",
    });
    expect(out).toBe("Hi Acme, invoice INV-0001.");
  });

  it("leaves unknown variables as literal placeholders", () => {
    const out = substituteEmailVars("{{businessName}} — {{phantom}}", {
      businessName: "Frizzo",
    });
    expect(out).toBe("Frizzo — {{phantom}}");
  });

  it("treats whitespace inside braces as part of the name", () => {
    const out = substituteEmailVars("{{ number }}", { number: "INV-1" });
    expect(out).toBe("INV-1");
  });

  it("returns the empty string for empty templates", () => {
    expect(substituteEmailVars("", { x: "y" })).toBe("");
  });

  it("does not HTML-escape (plaintext context)", () => {
    const out = substituteEmailVars("{{name}}", { name: "<b>bold</b>" });
    expect(out).toBe("<b>bold</b>");
  });
});
