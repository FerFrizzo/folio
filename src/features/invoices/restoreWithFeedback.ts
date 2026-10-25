import type { useToast } from "@/src/components/ui/Toast";
import { errorMessage } from "@/src/lib/zod-message";

type Toast = ReturnType<typeof useToast>;

// Restore an archived invoice or credit note and tell the user how it went.
// Without the catch, a failed restore (e.g. offline) closed the sheet and
// nothing else happened.
export async function restoreWithFeedback(
  label: string,
  restore: () => Promise<unknown>,
  toast: Toast,
): Promise<boolean> {
  try {
    await restore();
    toast.show({ message: `${label} restored.`, variant: "success" });
    return true;
  } catch (err) {
    console.error(err);
    toast.show({ message: errorMessage(err, "Couldn't restore."), variant: "error" });
    return false;
  }
}
