import {
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { signOutGoogleNative } from "@/features/auth/linking/google";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "unauthenticated"; user: null }
  | { status: "unconfigured"; user: null }
  | { status: "error"; user: null; error: Error }
  | { status: "ready"; user: User };

const AuthContext = createContext<AuthState>({ status: "loading", user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setState({ status: "unconfigured", user: null });
      return;
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          setState({ status: "ready", user });
        } else {
          setState({ status: "unauthenticated", user: null });
        }
      },
      (error) => {
        console.error("[Auth error]", error);
        setState({ status: "error", user: null, error });
      },
    );
    return unsub;
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export async function signOut(): Promise<void> {
  if (Platform.OS !== "web") {
    await signOutGoogleNative();
  }
  const auth = getFirebaseAuth();
  await fbSignOut(auth);
}
