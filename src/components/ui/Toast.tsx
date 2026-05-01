import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Pressable, Text, View } from "react-native";
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

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
        <View className="absolute inset-x-4 bottom-8 z-50 flex-row items-center justify-between rounded-card border border-border bg-surface px-4 py-3 shadow">
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
