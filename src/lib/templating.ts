// Plain {{var}} substitution for email subject/body templates. Per the Phase 4
// plan: missing variables are left as literal {{var}} so the user notices and
// fixes the template rather than sending an email with a silent blank.
//
// Variables shipped in Phase 4: number, total, dueDate, businessName,
// clientName. The function accepts any record so future additions don't
// require a parser change.

export function substituteEmailVars(
  template: string,
  vars: Record<string, string>,
): string {
  if (!template) return "";
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return vars[name] ?? "";
    }
    return match;
  });
}

export const EMAIL_VARS = [
  "number",
  "total",
  "dueDate",
  "businessName",
  "clientName",
] as const;
export type EmailVarName = (typeof EMAIL_VARS)[number];
