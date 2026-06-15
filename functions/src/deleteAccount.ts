import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { requireUid } from "./lib/auth";
import { adminDb } from "./lib/admin";

export const deleteAccount = onCall(
  { region: "australia-southeast1" },
  async (req) => {
    const uid = requireUid(req);
    const db = adminDb();

    // Delete all docs in subcollections
    const subcollections = ["invoices", "creditNotes", "clients", "lineItemLibrary"];
    for (const sub of subcollections) {
      const docs = await db.collection(`users/${uid}/${sub}`).listDocuments();
      if (docs.length > 0) {
        const batch = db.batch();
        for (const doc of docs) batch.delete(doc);
        await batch.commit();
      }
    }

    // Delete singleton docs
    const singles = ["profile/main", "settings/main", "subscription/main", "counters/main"];
    const batch = db.batch();
    for (const p of singles) batch.delete(db.doc(`users/${uid}/${p}`));
    await batch.commit();

    // Delete the user doc itself if it exists
    await db.doc(`users/${uid}`).delete();

    // Delete Firebase Auth user last
    await admin.auth().deleteUser(uid);

    return { ok: true };
  },
);
