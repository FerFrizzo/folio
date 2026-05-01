import JSZip from "jszip";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import * as Sharing from "expo-sharing";

// Build a ZIP blob from a map of filename → contents (string or Uint8Array).
// On native we then write the bytes to the cache dir and hand off to
// expo-sharing; on web we trigger a browser download.

export type ZipEntry = {
  name: string;
  content: string | Uint8Array;
};

export async function buildZip(entries: ZipEntry[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const e of entries) {
    if (typeof e.content === "string") {
      zip.file(e.name, e.content);
    } else {
      zip.file(e.name, e.content, { binary: true });
    }
  }
  return zip.generateAsync({ type: "uint8array" });
}

export async function shareZip(filename: string, bytes: Uint8Array): Promise<void> {
  if (Platform.OS === "web") {
    // Copy into a fresh ArrayBuffer to satisfy the Blob constructor's type.
    const copy = new Uint8Array(bytes);
    const blob = new Blob([copy.buffer as ArrayBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }

  // Native: write to cache via expo-file-system v19 File API, then share.
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);

  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/zip",
    dialogTitle: filename,
    UTI: "public.zip-archive",
  });
}
