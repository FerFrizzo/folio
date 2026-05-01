import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useState, type ReactNode } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { hasPin, verifyPin } from "@/src/features/auth/pin";

type GateState =
  | { kind: "checking" }
  | { kind: "no-pin" }
  | { kind: "locked"; biometricTried: boolean }
  | { kind: "unlocked" };

const supportsBiometric = Platform.OS !== "web";

export function Gate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: "checking" });
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const exists = await hasPin();
      if (cancelled) return;
      if (!exists) {
        setState({ kind: "no-pin" });
        return;
      }
      setState({ kind: "locked", biometricTried: false });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state.kind !== "locked" || state.biometricTried || !supportsBiometric) return;
    let cancelled = false;
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !enrolled) {
          if (!cancelled) setState({ kind: "locked", biometricTried: true });
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock Folio",
          fallbackLabel: "Use PIN",
          disableDeviceFallback: false,
        });
        if (cancelled) return;
        if (result.success) {
          setState({ kind: "unlocked" });
        } else {
          setState({ kind: "locked", biometricTried: true });
        }
      } catch {
        if (!cancelled) setState({ kind: "locked", biometricTried: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (state.kind === "checking") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-body text-muted">Loading…</Text>
      </View>
    );
  }

  if (state.kind === "no-pin" || state.kind === "unlocked") {
    return <>{children}</>;
  }

  async function submit() {
    setError(null);
    const ok = await verifyPin(pinInput);
    if (!ok) {
      setError("Incorrect PIN.");
      setPinInput("");
      return;
    }
    setState({ kind: "unlocked" });
  }

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="mb-2 text-h1 text-foreground">Enter your PIN</Text>
      <Text className="mb-8 text-body text-muted">
        {supportsBiometric
          ? "Biometric unlock unavailable — enter your PIN to continue."
          : "Enter the PIN you set up to unlock Folio."}
      </Text>
      <TextInput
        value={pinInput}
        onChangeText={setPinInput}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        autoFocus
        onSubmitEditing={() => void submit()}
        className="mb-4 h-12 w-48 rounded-button border border-border bg-surface px-4 text-center text-h1 text-foreground"
        placeholder="••••"
        placeholderTextColor="#9CA3AF"
        accessibilityLabel="PIN input"
      />
      {error ? (
        <Text className="mb-4 text-body text-status-overdue">{error}</Text>
      ) : null}
      <Pressable
        onPress={() => void submit()}
        accessibilityRole="button"
        className="rounded-button bg-accent px-6 py-3 active:bg-accent-hover"
      >
        <Text className="text-body font-semibold text-white">Unlock</Text>
      </Pressable>
    </View>
  );
}
