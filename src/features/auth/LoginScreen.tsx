import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, useToast } from "@/components/ui";
import { sendPasswordReset, signInWithEmail, signUpWithEmail } from "@/features/auth/email";
import {
  googleConfigured,
  signInWithGoogleIdToken,
  signInWithGoogleWeb,
  useGoogleAuth,
} from "@/features/auth/linking/google";
import { appleAvailableOnPlatform, signInWithApple } from "@/features/auth/linking/apple";
import { classifyLinkError } from "@/features/auth/linking/linkErrors";

type Mode = "sign-in" | "sign-up" | "forgot-password";

// Owns useGoogleAuth — must only be mounted when googleConfigured() returns
// true so the hook never runs without the required platform client ID.
function GoogleSignInButton({ busy, onBusyChange }: { busy: boolean; onBusyChange: (v: boolean) => void }) {
  const toast = useToast();
  const { promptAsync, response } = useGoogleAuth();

  useEffect(() => {
    if (!response || response.type !== "success") return;
    const idToken = response.authentication?.idToken;
    if (!idToken) return;
    onBusyChange(true);
    signInWithGoogleIdToken(idToken)
      .then(() => {
        toast.show({ message: "Signed in with Google.", variant: "success" });
      })
      .catch((err: unknown) => {
        const { message } = classifyLinkError(err);
        toast.show({ message, variant: "error" });
      })
      .finally(() => onBusyChange(false));
  }, [response, toast, onBusyChange]);

  async function handlePress() {
    if (Platform.OS === "web") {
      onBusyChange(true);
      try {
        await signInWithGoogleWeb();
        toast.show({ message: "Signed in with Google.", variant: "success" });
      } catch (err: unknown) {
        const { message } = classifyLinkError(err);
        toast.show({ message, variant: "error" });
      } finally {
        onBusyChange(false);
      }
      return;
    }

    onBusyChange(true);
    try {
      await promptAsync();
      // signInWithGoogleIdToken is handled in the response useEffect above.
      // We don't set busy=false here; the effect will do it.
    } catch (err: unknown) {
      const { message } = classifyLinkError(err);
      toast.show({ message, variant: "error" });
      onBusyChange(false);
    }
  }

  return (
    <Button
      label={busy ? "Signing in…" : "Continue with Google"}
      variant="secondary"
      size="lg"
      disabled={busy}
      onPress={() => void handlePress()}
    />
  );
}

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [busy, setBusy] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Field-level errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function clearErrors() {
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
  }

  function switchMode(next: Mode) {
    clearErrors();
    setMode(next);
  }

  function validate(): boolean {
    let ok = true;
    clearErrors();

    if (mode !== "forgot-password") {
      if (!email.trim()) {
        setEmailError("Email is required.");
        ok = false;
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        setEmailError("Enter a valid email address.");
        ok = false;
      }
    }

    if (mode === "sign-in" || mode === "sign-up") {
      if (!password) {
        setPasswordError("Password is required.");
        ok = false;
      } else if (mode === "sign-up" && password.length < 8) {
        setPasswordError("Password must be at least 8 characters.");
        ok = false;
      }
    }

    if (mode === "sign-up" && !name.trim()) {
      setNameError("Name is required.");
      ok = false;
    }

    return ok;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === "sign-in") {
        await signInWithEmail(email.trim(), password);
        toast.show({ message: "Welcome back!", variant: "success" });
      } else if (mode === "sign-up") {
        await signUpWithEmail(name.trim(), email.trim(), password);
        toast.show({ message: "Account created. Welcome to Folio!", variant: "success" });
      } else {
        await sendPasswordReset(email.trim());
        toast.show({
          message: "Reset email sent — check your inbox.",
          variant: "success",
        });
        switchMode("sign-in");
      }
    } catch (err: unknown) {
      const { message } = classifyLinkError(err);
      toast.show({ message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleApple() {
    setBusy(true);
    try {
      await signInWithApple();
      toast.show({ message: "Signed in with Apple.", variant: "success" });
    } catch (err: unknown) {
      const { message } = classifyLinkError(err);
      toast.show({ message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  const showGoogle = googleConfigured();
  const showApple = appleAvailableOnPlatform();
  const showSocialSection = showGoogle || showApple;

  if (mode === "forgot-password") {
    return (
      <ScrollView
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          gap: 24,
        }}
      >
        {/* Header */}
        <View className="items-center gap-2">
          <Text className="text-display font-bold text-accent">Folio</Text>
          <Text className="text-body text-muted">Reset your password</Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <Text className="text-body text-muted">
            Enter your email address and we'll send you a link to reset your password.
          </Text>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            error={emailError}
          />
          <Button
            label={busy ? "Sending…" : "Send reset email"}
            size="lg"
            disabled={busy}
            onPress={() => void handleSubmit()}
          />
        </View>

        {/* Back link */}
        <Pressable
          accessibilityRole="button"
          className="items-center py-1"
          onPress={() => switchMode("sign-in")}
        >
          <Text className="text-body text-accent">Back to sign in</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: insets.top + 32,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        gap: 24,
      }}
    >
      {/* App header */}
      <View className="items-center gap-2">
        <Text className="text-display font-bold text-accent">Folio</Text>
        <Text className="text-body text-muted">Simple invoicing for Australian businesses</Text>
      </View>

      {/* Mode toggle tabs */}
      <View className="flex-row rounded-button border border-border bg-surface p-1">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "sign-in" }}
          className={[
            "flex-1 items-center rounded-[8px] py-2",
            mode === "sign-in" ? "bg-accent" : "",
          ].join(" ")}
          onPress={() => switchMode("sign-in")}
        >
          <Text
            className={[
              "text-label font-semibold",
              mode === "sign-in" ? "text-white" : "text-muted",
            ].join(" ")}
          >
            Sign in
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "sign-up" }}
          className={[
            "flex-1 items-center rounded-[8px] py-2",
            mode === "sign-up" ? "bg-accent" : "",
          ].join(" ")}
          onPress={() => switchMode("sign-up")}
        >
          <Text
            className={[
              "text-label font-semibold",
              mode === "sign-up" ? "text-white" : "text-muted",
            ].join(" ")}
          >
            Sign up
          </Text>
        </Pressable>
      </View>

      {/* Email/password form */}
      <View className="gap-3">
        {mode === "sign-up" ? (
          <Input
            label="Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect={false}
            error={nameError}
          />
        ) : null}

        <Input
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          error={emailError}
        />

        <View className="gap-1">
          <Input
            label="Password"
            placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            error={passwordError}
          />
          {mode === "sign-in" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => switchMode("forgot-password")}
              className="self-end py-1"
            >
              <Text className="text-caption text-accent">Forgot password?</Text>
            </Pressable>
          ) : null}
        </View>

        <Button
          label={
            busy
              ? mode === "sign-in"
                ? "Signing in…"
                : "Creating account…"
              : mode === "sign-in"
                ? "Continue"
                : "Create account"
          }
          size="lg"
          disabled={busy}
          onPress={() => void handleSubmit()}
        />
      </View>

      {/* Divider */}
      {showSocialSection ? (
        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <Text className="text-caption text-muted">or</Text>
          <View className="h-px flex-1 bg-border" />
        </View>
      ) : null}

      {/* Social sign-in buttons */}
      {showSocialSection ? (
        <View className="gap-3">
          {showGoogle ? (
            <GoogleSignInButton busy={busy} onBusyChange={setBusy} />
          ) : null}
          {showApple ? (
            <Button
              label={busy ? "Signing in…" : "Continue with Apple"}
              variant="secondary"
              size="lg"
              disabled={busy}
              onPress={() => void handleApple()}
            />
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
