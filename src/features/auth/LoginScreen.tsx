import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { AntDesign } from "@expo/vector-icons";
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

const cardShadow = {
  shadowColor: "#3B5BDB",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 8,
} as const;

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

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
    } catch (err: unknown) {
      const { message } = classifyLinkError(err);
      toast.show({ message, variant: "error" });
      onBusyChange(false);
    }
  }

  return (
    <Pressable
      onPress={() => void handlePress()}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      className="flex-row items-center justify-center gap-3 rounded-button bg-white py-[14px] active:opacity-70"
      style={{ opacity: busy ? 0.5 : 1, ...cardShadow }}
    >
      <GoogleLogo />
      <Text className="text-body font-semibold text-foreground">
        {busy ? "Signing in…" : "Continue with Google"}
      </Text>
    </Pressable>
  );
}

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        toast.show({ message: "Reset email sent — check your inbox.", variant: "success" });
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 bg-background"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: insets.top + 48,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
            gap: 32,
          }}
        >
          <View className="items-center">
            <Image
              source={require("@/assets/images/splash-icon-transparent.png")}
              style={{ width: 200, height: 200 }}
              resizeMode="contain"
            />
          </View>

          <View
            className="rounded-2xl bg-white p-6 gap-4"
            style={cardShadow}
          >
            <View className="gap-1">
              <Text className="text-h2 font-bold text-foreground">Reset password</Text>
              <Text className="text-caption text-muted">
                Enter your email and we'll send you a reset link.
              </Text>
            </View>
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
            <Pressable
              accessibilityRole="button"
              className="items-center py-1"
              onPress={() => switchMode("sign-in")}
            >
              <Text className="text-caption text-accent">Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          gap: 20,
        }}
      >
      {/* Brand mark — full logo including wordmark */}
      <View className="items-center">
        <Image
          source={require("@/assets/images/splash-icon-transparent.png")}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
        />
      </View>

      {/* Auth card */}
      <View
        className="rounded-2xl bg-white p-6 gap-5"
        style={cardShadow}
      >
        {/* Sign in / Sign up tabs */}
        <View className="flex-row rounded-xl bg-gray-100 p-1">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "sign-in" }}
            className={[
              "flex-1 items-center rounded-[10px] py-2.5",
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
              "flex-1 items-center rounded-[10px] py-2.5",
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

        {/* Form fields */}
        <View className="gap-4">
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
        </View>

        <Button
          label={
            busy
              ? mode === "sign-in" ? "Signing in…" : "Creating account…"
              : mode === "sign-in" ? "Continue" : "Create account"
          }
          size="lg"
          disabled={busy}
          onPress={() => void handleSubmit()}
        />
      </View>

      {/* Social sign-in */}
      {showSocialSection ? (
        <>
          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-caption text-muted">or continue with</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <View className="gap-3">
            {showGoogle ? (
              <GoogleSignInButton busy={busy} onBusyChange={setBusy} />
            ) : null}
            {showApple ? (
              <Pressable
                onPress={() => void handleApple()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
                className="flex-row items-center justify-center gap-3 rounded-button bg-white py-[14px] active:opacity-70"
                style={{ opacity: busy ? 0.5 : 1, ...cardShadow }}
              >
                <AntDesign name="apple" size={20} color="#111827" />
                <Text className="text-body font-semibold text-foreground">
                  {busy ? "Signing in…" : "Continue with Apple"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
