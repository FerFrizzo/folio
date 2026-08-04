// ZodError.message is a JSON dump of every issue. Surfacing it in a toast puts
// raw `{"code":"too_small",...}` on the user's screen, so every catch that shows
// a caught error to a human should route through here.
import { ZodError } from "zod";

// Dotted paths users might actually see. Anything unmapped falls back to the
// raw path — imperfect but still readable, and it names the field.
const FIELD_LABELS: Record<string, string> = {
  "clientSnapshot.name": "Client name",
  issueDate: "Issue date",
  dueDate: "Due date",
};

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    if (!first) return fallback;
    const path = first.path.join(".");
    if (!path) return first.message;
    return `${FIELD_LABELS[path] ?? path}: ${first.message}`;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
