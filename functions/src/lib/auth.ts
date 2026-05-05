import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

export function requireUid(req: CallableRequest): string {
  if (!req.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  return req.auth.uid;
}
