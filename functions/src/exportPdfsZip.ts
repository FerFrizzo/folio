import { onCall, HttpsError } from "firebase-functions/v2/https";
import archiver from "archiver";
import { Writable } from "stream";
import { requireUid } from "./lib/auth";
import {
  fetchProfile,
  fetchSettings,
  listCreditNotesForUser,
  listInvoicesForUser,
} from "./lib/firestore";
import {
  generateCreditNotePdfBuffer,
  generateInvoicePdfBuffer,
} from "./lib/pdf";
import { uploadExportZip } from "./lib/storage";

// Server-side PDF ZIP export. Spec §10: Cloud Function for >50 docs. Streams
// the archive into a buffer in memory (acceptable up to a few hundred docs;
// beyond that we'd stream to GCS directly).

export const exportPdfsZip = onCall(
  {
    region: "australia-southeast1",
    memory: "2GiB",
    timeoutSeconds: 540,
  },
  async (req) => {
    const uid = requireUid(req);
    const profile = await fetchProfile(uid);
    const settings = await fetchSettings(uid);
    const [invoices, creditNotes] = await Promise.all([
      listInvoicesForUser(uid),
      listCreditNotesForUser(uid),
    ]);

    if (invoices.length === 0 && creditNotes.length === 0) {
      throw new HttpsError("failed-precondition", "Nothing to export.");
    }

    // Buffer the archive in memory. archiver writes incrementally; we collect
    // chunks and concat at the end.
    const chunks: Buffer[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(sink);

    for (const inv of invoices) {
      const { buffer } = await generateInvoicePdfBuffer({
        invoice: inv,
        profile,
        settings,
      });
      archive.append(buffer, { name: `${inv.number}.pdf` });
    }
    for (const cn of creditNotes) {
      const { buffer } = await generateCreditNotePdfBuffer({
        creditNote: cn,
        profile,
        settings,
      });
      archive.append(buffer, { name: `${cn.number}.pdf` });
    }

    await archive.finalize();
    // Wait for the sink to drain.
    await new Promise<void>((resolve) => sink.on("finish", resolve));
    const zipBuffer = Buffer.concat(chunks);

    const { url, path } = await uploadExportZip(uid, zipBuffer);
    return { ok: true as const, url, path, count: invoices.length + creditNotes.length };
  },
);
