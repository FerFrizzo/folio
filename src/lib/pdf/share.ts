import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { pdfFileName } from "@/src/lib/pdf/filename";

export type SharePdfOptions = {
  // Desired user-facing name, typically the invoice / credit-note number.
  fileName?: string;
  // Name to use when `fileName` is empty/undefined (e.g. "invoice").
  fallback: string;
  dialogTitle: string;
};

// Cross-platform PDF share. Native: native share sheet. Web: triggers a
// download of the file (expo-sharing falls back to anchor-click on web).
//
// expo-print names its temp file with a UUID and Sharing.shareAsync uses that
// temp file's name verbatim, so on native we first copy the PDF to a file named
// after the invoice number — otherwise the shared/saved file is a UUID.
export async function sharePdf(uri: string, opts: SharePdfOptions): Promise<void> {
  const name = pdfFileName(opts.fileName, opts.fallback);
  if (Platform.OS === "web") {
    // expo-sharing.isAvailableAsync returns false on web; manually trigger a
    // download from the data URI / blob URL.
    const a = document.createElement("a");
    a.href = uri;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(renameForShare(uri, name), {
    mimeType: "application/pdf",
    dialogTitle: opts.dialogTitle,
    UTI: "com.adobe.pdf",
  });
}

// Copy the printed temp file to a cache file named `name` and return its URI so
// the share sheet presents the invoice number as the filename. Falls back to
// the original URI if the copy fails for any reason.
function renameForShare(uri: string, name: string): string {
  try {
    const dest = new File(Paths.cache, name);
    if (dest.exists) dest.delete();
    new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}
