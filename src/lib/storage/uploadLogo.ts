import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";
import { getFirebaseStorage } from "@/src/lib/firebase";

// Spec §2: resize logo to ≤500px wide on upload. Stored at users/{uid}/logo.png
// — the path is intentionally fixed so a new upload overwrites the old, and
// getDownloadURL produces a stable token-bearing URL the PDF template can
// embed via @page background or <img>.

export type PickAndUploadLogoResult =
  | { ok: true; url: string }
  | { ok: false; reason: "permission" | "cancelled" | "upload-failed"; error?: unknown };

export async function pickAndUploadLogo(uid: string): Promise<PickAndUploadLogoResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { ok: false, reason: "permission" };
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
    exif: false,
  });
  if (picked.canceled || !picked.assets[0]) {
    return { ok: false, reason: "cancelled" };
  }
  const asset = picked.assets[0];

  // Resize to max 500 px wide; expo-image-manipulator preserves aspect ratio.
  const resized = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 500 } }],
    {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.PNG,
    },
  );

  try {
    const blob = await fetchAsBlob(resized.uri);
    const storage = getFirebaseStorage();
    const objectRef = ref(storage, `users/${uid}/logo.png`);
    await uploadBytes(objectRef, blob, { contentType: "image/png" });
    const url = await getDownloadURL(objectRef);
    return { ok: true, url };
  } catch (error) {
    return { ok: false, reason: "upload-failed", error };
  }
}

// expo-file-system fetch on web returns a Response; native returns a Blob via
// fetch(uri). Both yield a usable Blob. Branch only if needed.
async function fetchAsBlob(uri: string): Promise<Blob> {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    return res.blob();
  }
  const res = await fetch(uri);
  return res.blob();
}
