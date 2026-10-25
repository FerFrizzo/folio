const NULLABLE_TIMESTAMPS = ["createdAt", "updatedAt", "deletedAt", "sentAt", "paidAt"] as const;

// Firestore field deletes are stored as null. Optional timestamp fields reject
// null, which would drop the document from every server read.
export function omitNullTimestamps<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = { ...data };
  for (const key of NULLABLE_TIMESTAMPS) {
    if (key in out && out[key] == null) delete out[key];
  }
  return out as T;
}
