import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export function adminDb(): admin.firestore.Firestore {
  return admin.firestore();
}

export function adminStorage(): admin.storage.Storage {
  return admin.storage();
}
