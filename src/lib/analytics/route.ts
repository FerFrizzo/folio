// expo-router's useSegments() yields route *patterns* ("[id]"), not concrete
// values, so joining them never leaks a document ID. Groups like "(tabs)"
// don't appear in URLs, so drop them for a stable template.
export function normaliseRoute(segments: readonly string[]): string {
  const visible = segments.filter((s) => !/^\(.*\)$/.test(s));
  return visible.length === 0 ? "/" : `/${visible.join("/")}`;
}
