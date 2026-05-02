import {
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/src/lib/firebase";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "unconfigured"; user: null }
  | { status: "error"; user: null; error: Error }
  | { status: "ready"; user: User };

const AuthContext = createContext<AuthState>({ status: "loading", user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });
  // Set while an anonymous sign-in is in flight so we don't trigger a second
  // one when onAuthStateChanged fires with `null` mid-call.
  const signInInFlight = useRef(false);

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
          return;
        }
        // No user — either first launch or post-signOut. Always try to
        // restore an anonymous session unless one's already on the wire.
        if (signInInFlight.current) return;
        signInInFlight.current = true;
        setState({ status: "loading", user: null });
        signInAnonymously(auth)
          .catch((error: unknown) => {
            setState({
              status: "error",
              user: null,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          })
          .finally(() => {
            signInInFlight.current = false;
          });
      },
      (error) => {
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

// Sign out the current user. The AuthProvider's onAuthStateChanged listener
// will then sign in a fresh anonymous user automatically. Used by the
// AboutCard's "Sign out" action and by the link-account "switch account"
// fallback when the picked credential is already linked elsewhere.
export async function signOut(): Promise<void> {
  // Allow re-attempt of the auto anonymous-sign-in on the next auth state
  // change. Without resetting this, the listener short-circuits.
  const auth = getFirebaseAuth();
  await fbSignOut(auth);
}
