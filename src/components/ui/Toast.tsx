import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Keyboard, Platform, Pressable, Text, View } from "react-native";
import { cn } from "@/src/lib/cn";

type Variant = "info" | "success" | "warning" | "error";

type Toast = {
  id: number;
  message: string;
  variant: Variant;
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
};

type ToastInput = {
  message: string;
  variant?: Variant;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

type ToastContext = {
  show: (input: ToastInput) => void;
};

const Ctx = createContext<ToastContext>({ show: () => undefined });

let nextId = 1;

// Height of the on-screen keyboard, or 0 when it's down. The toast is pinned to
// the bottom of the screen, so without this a toast fired while an input is
// focused — e.g. "Saved to library" — renders behind the keyboard and the tap
// looks like a no-op. Subscribing to both the `will` and `did` variants covers
// iOS (which fires `will` first) and Android with one code path.
//
// The measured height is only ever applied as an offset on iOS. On Android
// this app uses Expo's default `softwareKeyboardLayoutMode: "resize"`
// (adjustResize) — app.config.ts sets no override — so the OS already shrinks
// the window when the keyboard opens, and a view pinned to `bottom: 32` is
// already clear of it. Adding the keyboard height on top of that would push
// the toast ~300dp too high, potentially behind the header. Web never shows a
// software keyboard that overlaps the layout, so it stays at 0 too. We keep
// subscribing to all four events on every platform anyway (rather than
// skipping the subscriptions on non-iOS) so listener behaviour — and this
// hook's tests — stay deterministic across platforms.
function useKeyboardOffset(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const onShow = (e: { endCoordinates?: { height?: number } }) =>
      setHeight(e.endCoordinates?.height ?? 0);
    const onHide = () => setHeight(0);
    const subs = [
      Keyboard.addListener("keyboardWillShow", onShow),
      Keyboard.addListener("keyboardDidShow", onShow),
      Keyboard.addListener("keyboardWillHide", onHide),
      Keyboard.addListener("keyboardDidHide", onHide),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  return Platform.OS === "ios" ? height : 0;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const keyboardOffset = useKeyboardOffset();

  const show = useCallback((input: ToastInput) => {
    const t: Toast = {
      id: nextId++,
      message: input.message,
      variant: input.variant ?? "info",
      ...(input.actionLabel != null ? { actionLabel: input.actionLabel } : {}),
      ...(input.onAction != null ? { onAction: input.onAction } : {}),
      durationMs: input.durationMs ?? 4000,
    };
    setToast(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast ? (
        <View
          testID="toast"
          className="absolute inset-x-4 z-50 flex-row items-center justify-between rounded-card border border-border bg-surface px-4 py-3 shadow"
          style={{ bottom: keyboardOffset + 32 }}
        >
          <Text
            className={cn(
              "flex-1 text-body",
              toast.variant === "error" ? "text-status-overdue" :
              toast.variant === "success" ? "text-status-paid" :
              toast.variant === "warning" ? "text-status-sent" :
              "text-foreground",
            )}
          >
            {toast.message}
          </Text>
          {toast.actionLabel ? (
            <Pressable
              onPress={() => {
                toast.onAction?.();
                setToast(null);
              }}
              accessibilityRole="button"
              className="ml-3"
            >
              <Text className="text-body font-semibold text-accent">
                {toast.actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
