import { deviceStorage } from "@/src/lib/deviceStorage";

// Remembers whether anyone has signed in on this device, so the login screen
// can open on "Sign in" for returning users and "Create account" for new
// installs. Storage failures fall back to the new-install default.

const KEY = "folio.auth.hasSignedIn";

export async function hasSignedInBefore(): Promise<boolean> {
  try {
    return (await deviceStorage.getItem(KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markSignedIn(): Promise<void> {
  try {
    await deviceStorage.setItem(KEY, "1");
  } catch {
    // Only affects which tab the login screen opens on.
  }
}
